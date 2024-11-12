import OpenAI from "openai";
import ChatBot from "react-chatbotify";
import axios from "axios";
require('dotenv').config();


let anonymizedText = "";
let assistant = "";
let count = 0;
let inputText = "";
let threadId = null;  // Store thread ID globally

async function runPythonScript(apiKey, inputText) {
  try {
    const response = await axios.post('http://localhost:3001/anonymize', { apiKey, inputText });
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

const MyChatBot = () => {
  const settings = {
    general: {
      primaryColor: "#060270",
      secondaryColor: "#747676",
      showFooter: false,
      embedded: true,
    },
    header: {
      showAvatar: true,
      title: "Rowan",
    },
    botBubble: {
      simStream: true,
    },
    tooltip: {
      mode: "CLOSE",
      text: "I am vapebot, talk to me if you are craving your vape.",
    },
    notification: { disabled: true },
  };

  let apiKey = null;
  let modelType = "gpt-3.5-turbo";
  let role = "";
  let content = "";
  let hasError = false;

  const call_openai = async (params) => {
    try {
      console.log(params.userInput);
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      if (!assistant) {
        assistant = await openai.beta.assistants.create({
          name: "VapeBot",
          instructions: "You are a mentor older than the user who has already succeeded in quitting vaping. Your display name is Rowan. You want to help the user quit as well. Generate a story of your vaping behaviors and how you quit along with struggles you faced, why you quit, why you started vaping, vaping triggers, and other factors. The user will ask about your experience so stick to the same story. You do not have professional jargon. Your greeting and farewell behavior is informal. You engage in frequent social dialogues, meta-relational talk, reciprocal self-disclosure, emotionally involved empathy, humor, and frequent continuity behaviors. Keep your answers brief and remember you are talking to an 18–25-year-old. Try to prompt the user as much as possible, so the conversation doesn't come to a stall. Unless directly asked, do not provide medical advice.",
          model: "gpt-4o-mini",
        });
      }

      // Reuse the thread or create a new one
      if (!threadId) {
        const thread = await openai.beta.threads.create();
        threadId = thread.id; // Store the thread ID for future use
      }

      const compliantgptKey = '23dcc2a0-6f42-4122-ab2d-cf840277464f';
      inputText = params.userInput;
      if (count == 0) {
        inputText = "Greet the user, introduce yourself and check in on the users nicotene usage. Assume it is your first time talking.";
        count = count + 1;
      }

      try {
        const result = await runPythonScript(compliantgptKey, inputText);
        console.log(result);
        anonymizedText = result.anonymized_text;
        console.log(anonymizedText);
      } catch (error) {
        console.error(error);
      }

      const message = await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: anonymizedText,
      });

      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistant.id,
      });

      console.log(run);

      const checkStatusAndPrintMessages = async (threadId, runId) => {
        try {
          let startTime = Date.now(); // Track when the polling started
          let attempts = 0; // Count how many times the status has been checked
      
          const intervalId = setInterval(async () => {
            attempts += 1;
      
            try {
              let runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
      
              if (runStatus.status === "completed") {
                clearInterval(intervalId);
      
                let messages = await openai.beta.threads.messages.list(threadId);
                if (messages.data.length > 0) {
                  const firstMessage = messages.data[0];
                  role = firstMessage.role;
                  content = firstMessage.content[0].text.value;
                  console.log(`Run completed successfully after ${attempts} attempts and ${Math.round((Date.now() - startTime) / 1000)} seconds.`);
                  params.injectMessage(`Rowan: ${content}`);
                } else {
                  console.log("No messages found.");
                }
              } else {
                console.log(`[Attempt ${attempts}] Run status: "${runStatus.status}" - Time elapsed: ${Math.round((Date.now() - startTime) / 1000)} seconds`);
                console.log("Run status details:", JSON.stringify(runStatus, null, 2));
                
                // Log any additional details from the runStatus object
                if (runStatus.details) {
                  console.log(`Details: ${JSON.stringify(runStatus.details)}`);
                }
                
                // Provide more information if available
                if (runStatus.reason) {
                  console.log(`Reason for incomplete status: ${runStatus.reason}`);
                }
              }
      
            } catch (error) {
              console.error(`[Attempt ${attempts}] Failed to retrieve run status due to error:`, error.message);
              if (error.response && error.response.data) {
                console.error("Error details:", JSON.stringify(error.response.data));
              }
            }
            
          }, 5000); // Check every 5 seconds
      
        } catch (error) {
          console.error("Error initializing run status check:", error.response?.data || error.message);
        }
      };

      setTimeout(() => {
        checkStatusAndPrintMessages(threadId, run.id);
      }, 10000);

    } catch (error) {
      await params.injectMessage("Unable to load model, is your API Key valid?");
      console.log(error);
      hasError = true;
    }
  };
  

  const flow = {
    start: {
      message: async (params) => {
        console.log(params.userInput);
        await call_openai(params);
      },
      path: "loop",
      isSensitive: false,
    },
    loop: {
      message: async (params) => {
        console.log(params.userInput);
        await call_openai(params);
      },
      path: "loop",
    },
  };

  return (
    <ChatBot
      options={{ theme: { embedded: true }, chatHistory: { storageKey: "example_llm_conversation" } }}
      flow={flow}
      settings={settings}
    />
  );
};

export default MyChatBot;
