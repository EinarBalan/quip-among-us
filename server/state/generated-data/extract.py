import re
import csv
import os
import google.generativeai as genai
import time
from typing import List

def extract_prompts_from_js(js_file_path: str) -> List[str]:
    """Extract prompts from JavaScript file"""
    with open(js_file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Find content between [ and ]
    start = content.find('[') + 1
    end = content.rfind(']')
    prompts_text = content[start:end]
    
    # Split by comma and clean up each prompt
    prompts = [
        prompt.strip().strip('"').replace('\\u2019', "'")
        for prompt in prompts_text.splitlines()
        if prompt.strip() and '"' in prompt  # Only keep lines that contain quotes
    ]
    
    print(f"Total prompts found: {len(prompts)}")
    return prompts

def get_gemini_response(prompt: str) -> str:
    """Get response from Gemini for a single prompt"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        system_prompt = "You are participating in a humor game. Generate a funny, witty response to the prompt. If it's a question, answer within one sentence. If it's a sentence with a blank, fill in the blank. Always answer like a normal human being, has to be hilarious, not with too many big words."
        full_prompt = f"{system_prompt}\n\nPrompt: {prompt}"
        
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error getting response for prompt '{prompt}': {str(e)}")
        raise

def run_script(start_idx: int, end_idx: int):
    """Run the script for a specific range of prompts"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    JS_FILE_PATH = os.path.join(script_dir, 'Prompts.pg13.js')
    OUTPUT_CSV = os.path.join(script_dir, 'prompts_and_responses.csv')
    
    try:
        # Configure Gemini
        api_key = os.getenv('API_KEY')
        if not api_key:
            raise ValueError("Please set the API_KEY environment variable")
        genai.configure(api_key=api_key)
        
        # Extract prompts
        all_prompts = extract_prompts_from_js(JS_FILE_PATH)
        if not all_prompts:
            print("No prompts found in the JavaScript file.")
            return
            
        # Validate indices
        if start_idx < 0 or end_idx > len(all_prompts) or start_idx > end_idx:
            print(f"Invalid range. Please use indices between 0 and {len(all_prompts)-1}")
            return
            
        # Get the specified range of prompts
        prompts_to_process = all_prompts[start_idx:end_idx]
        
        # Read existing responses if file exists
        existing_responses = {}
        try:
            with open(OUTPUT_CSV, 'r', newline='', encoding='utf-8') as file:
                reader = csv.reader(file)
                next(reader)  # Skip header
                for row in reader:
                    existing_responses[row[0]] = row[1]
        except FileNotFoundError:
            pass
        
        # Process prompts and append to CSV
        mode = 'a' if existing_responses else 'w'
        with open(OUTPUT_CSV, mode, newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            if mode == 'w':
                writer.writerow(['Prompt', 'Response'])
            
            for i, prompt in enumerate(prompts_to_process):
                # print("this is my prompt:", prompt)
                current_idx = start_idx + i
                print(f"Processing prompt {current_idx}/{len(all_prompts)-1}: {prompt}")
                
                try:
                    response = get_gemini_response(prompt)
                    writer.writerow([prompt, response])
                    file.flush()  # Ensure the row is written immediately
                    print(f"Successfully processed prompt {current_idx}")
                    time.sleep(1)  # Rate limiting
                    
                except Exception as e:
                    print(f"\nError processing prompt {current_idx}: {str(e)}")
                    print("You can resume by running the script with:")
                    print(f"run_script({current_idx}, {end_idx})")
                    break
        
        print(f"\nProcess completed for prompts {start_idx} to {end_idx-1}!")
        
    except FileNotFoundError:
        print(f"Could not find the file: {JS_FILE_PATH}")
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    # Example usage:
    run_script(453, 550)  # Process prompts from index start to end number