import express from "express";
import bodyParser from "body-parser";
import { spawn } from "child_process";
import cors from "cors";
let output = '';
let errorOutput = '';
let jsonResponse = '';
const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

app.post('/anonymize', (req, res)=> {
    const {apiKey, inputText} = req.body;
    if(!apiKey || !inputText){
        return res.status(400).send('API Key and input text are required');
    }
    const pythonProcess = spawn('python', ['anonymize.py', apiKey, inputText]);
    
    pythonProcess.stdout.on('data',(data) => {
        output += data.toString();
        console.log(output);
    });
    pythonProcess.stderr.on('data',(data) => {
        console.error(`stderr: ${data}`);
    });
    pythonProcess.on('close',(code) => {
        if(code !=0) {
            console.error(`Python script exited with code ${code}: ${errorOutput}`);
            return res.status(500).send(`Python script exited with code ${code}: ${errorOutput}`);
        }
        try {
             jsonResponse = JSON.parse(output);
            res.json(jsonResponse);
            output="";
            jsonResponse="";
        } catch(error) {
            console.error("Error parsing python script output: ",error);
            res.status(500).send('Error parsing Python Script output: ');
        }
    });
});
app.listen(port,() => {
    console.log(`Server is running on http://localhost:${port}`);
});