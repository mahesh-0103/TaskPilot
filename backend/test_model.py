from transformers import pipeline

try:
    pipeline('text2text-generation', model='model', tokenizer='model')
except Exception as e:
    import traceback
    traceback.print_exc()
