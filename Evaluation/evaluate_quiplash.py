import os
import json
import pandas as pd
from glob import glob
from bert_score import score as bert_score
import nltk

# Ensure nltk punkt tokenizer is available
nltk.download('punkt', quiet=True)

def ensure_directory_exists(directory):
    """Ensure the given directory exists."""
    if not os.path.exists(directory):
        os.makedirs(directory)

def evaluate(json_file, is_last_file=False):
    """
    Evaluate a single JSON file to compute required metrics and save results.
    Args:
        json_file (str): Path to the JSON file.
        is_last_file (bool): True if this is the last JSON file being processed.
    """
    # Ensure results directory exists
    ensure_directory_exists("results")

    # Read JSON file
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error reading {json_file}: {e}")
        return None

    # Extract AI model-specific answers and calculate BERT Score
    ai_models = {"gpt": [], "claude": [], "gemini": []}
    references = []

    for question, answers in data.items():
        if not isinstance(answers, dict):
            continue  # Skip non-question keys

        winning_answer = answers.get("winningAnswer", "").strip()
        references.append(winning_answer)

        for answer, details in answers.items():
            if not isinstance(details, dict):
                continue

            submitter = details.get("submitter", "").lower()
            if "ai (gpt)" in submitter:
                ai_models["gpt"].append(answer.strip())
            elif "ai (claude)" in submitter:
                ai_models["claude"].append(answer.strip())
            elif "ai (gemini)" in submitter:
                ai_models["gemini"].append(answer.strip())

    # Calculate BERT Scores for each AI model
    model_scores = {}
    model_details = []
    for model, answers in ai_models.items():
        if answers:
            P, R, F1 = bert_score(answers, references[:len(answers)], lang="en", verbose=False)
            model_scores[model] = F1.mean().item()
            for i, answer in enumerate(answers):
                model_details.append({
                    "Model": model,
                    "Answer": answer,
                    "Winning Answer": references[i],
                    "BERT Score": F1[i].item()
                })
        else:
            model_scores[model] = None

    # Save model-specific evaluation details to a file
    model_details_df = pd.DataFrame(model_details)
    evaluation_filename = f"results/{os.path.basename(json_file).replace('.json', '')}_evaluation.csv"
    model_details_df.to_csv(evaluation_filename, index=False)

    # Save overall BERT scores to evaluation_scores.csv
    result_row = {"Filename": os.path.basename(json_file)}
    result_row.update({f"BERT Score ({model})": score for model, score in model_scores.items()})
    result_filename = "results/evaluation_scores.csv"

    if not os.path.exists(result_filename):
        pd.DataFrame([result_row]).to_csv(result_filename, index=False)
    else:
        result_df = pd.read_csv(result_filename)
        result_df = pd.concat([result_df, pd.DataFrame([result_row])])
        result_df.to_csv(result_filename, index=False)

    # If this is the last file, calculate final averages
    if is_last_file:
        result_df = pd.read_csv(result_filename)
        avg_scores = {f"Avg BERT Score ({model})": result_df[f"BERT Score ({model})"].mean() for model in ai_models.keys()}
        final_row = {"Filename": "Final AVG"}
        final_row.update(avg_scores)
        result_df = pd.concat([result_df, pd.DataFrame([final_row])])
        result_df.to_csv(result_filename, index=False)

    return model_scores


def process_all_reports():
    """
    Process all JSON files in the ./reports/ folder and calculate metrics.
    """
    json_files = glob('./reports/*.json')
    if not json_files:
        print("No JSON files found in ./reports/ folder.")
        return

    for idx, json_file in enumerate(json_files):
        print(f"Processing: {json_file}")
        is_last_file = (idx == len(json_files) - 1)
        evaluate(json_file, is_last_file=is_last_file)

    print("Processing complete. Results saved to results/evaluation_scores.csv")


if __name__ == "__main__":
    process_all_reports()
