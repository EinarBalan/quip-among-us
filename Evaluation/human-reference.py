import os
import json

data = []
results = {
    'gpt': {
        'numTimesVotedFunniest': 0,
        'numTimesVotedAI': 0,
        'numRoundsPlayed': 0,
        'percentTimesVotedFunniest': 0,
        'percentTimesVotedAI': 0,
    },
    'claude': {
        'numTimesVotedFunniest': 0,
        'numTimesVotedAI': 0,
        'numRoundsPlayed': 0,
        'percentTimesVotedFunniest': 0,
        'percentTimesVotedAI': 0,
    },
    'gemini': {
        'numTimesVotedFunniest': 0,
        'numTimesVotedAI': 0,
        'numRoundsPlayed': 0,
        'percentTimesVotedFunniest': 0,
        'percentTimesVotedAI': 0,
    },
}

reports_dir = './reports'

NUM_VOTES_PER_ROUND = 8

for filename in os.listdir(reports_dir):
    if filename.endswith('.json'):
        with open(os.path.join(reports_dir, filename), 'r') as file:
            data.append(json.load(file))
            
for round in data:
    for prompt, value in round.items():
        if type(value) == dict:
            for answer, value in value.items():
                if type(value) == dict and value['submitter'][:2] == 'AI':
                    model = value['submitter'][4:-1]
                    results[model]['numRoundsPlayed'] += 1
                    if 'votes' in value:
                        results[model]['numTimesVotedFunniest'] += len(value['votes'])
                    if 'aiVotes' in value:
                        results[model]['numTimesVotedAI'] += len(value['aiVotes'])

for model in results:
    results[model]['percentTimesVotedFunniest'] = results[model]['numTimesVotedFunniest'] / (NUM_VOTES_PER_ROUND * results[model]['numRoundsPlayed']) * 100
    results[model]['percentTimesVotedAI'] = results[model]['numTimesVotedAI'] / (NUM_VOTES_PER_ROUND * results[model]['numRoundsPlayed']) * 100

import matplotlib.pyplot as plt

models = list(results.keys())
percent_times_voted_funniest = [results[model]['percentTimesVotedFunniest'] for model in models]
percent_times_voted_ai = [results[model]['percentTimesVotedAI'] for model in models]

x = range(len(models))

fig, ax = plt.subplots()
bar_width = 0.35

bars1 = ax.bar(x, percent_times_voted_funniest, bar_width, label='Percent Times Voted Funniest')
bars2 = ax.bar([i + bar_width for i in x], percent_times_voted_ai, bar_width, label='Percent Times Voted AI')

ax.set_xlabel('Models')
ax.set_ylabel('Percentage')
ax.set_title('Percentage of Times Voted Funniest and AI for Each Model')
ax.set_xticks([i + bar_width / 2 for i in x])
ax.set_xticklabels(models)
ax.legend()

plt.tight_layout()
plt.savefig('results.png')
plt.show()
             
     
# write results to file
with open('results.json', 'w') as file:
    json.dump(results, file)


