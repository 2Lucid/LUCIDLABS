import { generateContexts } from './app/actions';

async function main() {
    console.log("Testing generateContexts...");
    try {
        const result = await generateContexts({
            subject: 'Mathématiques',
            level: 'Seconde',
            count: 1,
            style: 'telegraphic'
        });
        console.log("Success:", result);
    } catch (e) {
        console.error("Caught error:", e);
    }
}
main();
