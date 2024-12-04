# Evaluation

## GPTasJudge.ipynb

To run, change the following:
- folder_path
- open.api_key (removed the secret)

This notebook uses OpenAI API to ask GPT to judge which response to an input prompt is:
1. most funny and 
2. generate by a LLM

It also evaluates whether GPT's answers agrees with those selected by participants in the quip-lash game. 
Since GPT's answers are not deterministic, we repeatedly ask GPT 10 times. 

Note: We did attempt using Llama-3.2-1B-Instruct, but, if we use the same prompt as for GPT, Llama generated non-sensical answers like "response," "based," or "after." Our intention is for the LLMs to select a number 1, 2, 3, where 3 is the number of humourous responses to select from.