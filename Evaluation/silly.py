import os
import json


data = []
answers = ""
ai_answers = []

reports_dir = './reports'

INCLUDE_AI = True

# load human answers
for filename in os.listdir(reports_dir):
    if filename.endswith('.json'):
        with open(os.path.join(reports_dir, filename), 'r') as file:
            data.append(json.load(file))
            
for round in data:
    for prompt, value in round.items():
        if type(value) == dict:
            for answer, value in value.items():
                if type(value) != dict: continue
                
                if value['submitter'][:2] == 'AI':
                    ai_answers.append((answer, value['submitter']))
                    if INCLUDE_AI: answers += " " + answer.lower()
                elif not INCLUDE_AI and value['submitter'][:2] != 'AI':
                    answers += " " + answer.lower()

results = {
    
}

# for every ai_answer, get rate of occurence of n-grams up to 4
for ai_answer, submitter in ai_answers:
    grams = ai_answer.split()
    silly = 0
    for i in range(1, max(5, len(grams))):
        igrams = [" ".join(grams[j:j+i]) for j in range(len(grams)-i+1)]
        product = 1
        for igram in igrams:
            count = answers.count(igram.lower())
            product *= count
        silly += product
    silly /= 4
    results[ai_answer] = {
        'silly': silly,
        'submitter': submitter
    }
    
    
avg_silly = {
    # 'submitter': { average silly score }
}

# check which ai answers have highest silly score on average
for result in results:
    submitter = results[result]['submitter']
    if submitter not in avg_silly:
        avg_silly[submitter] = {}
        avg_silly[submitter]["avg"] = 0
        avg_silly[submitter]["count"] = 0
    avg_silly[submitter]["avg"] += results[result]['silly']
    avg_silly[submitter]["count"] += 1

for submitter in avg_silly:
    avg_silly[submitter] = avg_silly[submitter]["avg"] / avg_silly[submitter]["count"]
    
with open('silly.json', 'w') as file:
    json.dump(results, file)
    
with open('avg_silly.json', 'w') as file:
    json.dump(avg_silly, file)
    
    
import matplotlib.pyplot as plt

# Extract data for plotting
submitters = list(avg_silly.keys())
avg_scores = list(avg_silly.values())

# Create the plot
plt.figure(figsize=(10, 6))
plt.bar(submitters, avg_scores, color='skyblue')

# Add titles and labels
plt.title('Average Silly Scores by Model')
plt.xlabel('Model')
plt.ylabel('Average Silly Score')

# Rotate x-axis labels for better readability
plt.xticks(rotation=45, ha='right')

# Show the plot
plt.tight_layout()
plt.show()
