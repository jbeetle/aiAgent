import readline from 'node:readline/promises';
import {stdin as input, stdout as output} from 'node:process';
import {Models} from '../src/index.js';
//import {getSemanticId} from './qid/qidService.js';

/* CLI */
const rl = readline.createInterface({input, output});
//const llmClient = createModel('DeepSeek', 'deepseek-chat');
const llmClient = Models.createModel('DeepSeek', 'deepseek-chat', {
    connections: 5,
    allowH2: true,
    keepAliveTimeout: 1000 * 30
});
const agent = new Models.SessionChat(llmClient, 'You are a helpful assistant.', {
    maxMessages: 20,
    tokenLimit: 4000,
    compressThreshold: 15,
    importanceThreshold: 0.3,
    verbose: true,
    manualOperation: true
});

console.log('Agent ready. Type "exit" to quit.');

async function main() {
    while (true) {
        const line = await rl.question('> ');
        if (line.trim().toLowerCase() === 'exit') {
            break;
        } else if (line.trim().toLowerCase() === 'history') {
            const history = agent.getHistory();
            console.log(history);
        } else if (line.trim().toLowerCase() === 'manual') {
            agent.keepLatestUserMessages();
            const history = agent.getHistory();
            console.log(history);
        } else {
            //console.log('\n' + '='.repeat(10));
            //let qid = await getSemanticId(line);
            //console.log(line, qid);
            //console.log('\n' + '='.repeat(10));
            await agent.streamChat(line, (chunk, isReasoning, isFinished) => {
                if (!isReasoning && !isFinished) {
                    //console.log(chunk);
                    process.stdout.write(chunk);
                }
            })
        }
    }
    rl.close();
}

main().catch(console.error);