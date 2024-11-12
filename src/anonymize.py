import sys
import json
import requests 


def anonymize_text(api_key, text):
    try:
        url = "https://api.compliantchatgpt.com/v1/anonymize"
        headers = {
            'x-compliantchatgpt-key':'d522b63b-0453-4640-8ff7-63ff61a2d0a6',
            'Content-Type':'application/json'
        }
        data= {"text":text}
        response = requests.post(url,headers=headers,data=json.dumps(data))
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}
def main():
    try:
        if len(sys.argv) < 3:
            raise ValueError("API key and input text are required")
        api_key = sys.argv[1]
        input_text=sys.argv[2]

        result = anonymize_text(api_key,input_text)
        if "error" in result:
            print(json.dumps({"error": result["error"]}))
            sys.exit(1)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error":str(e)}))
if __name__=="__main__":
    main()