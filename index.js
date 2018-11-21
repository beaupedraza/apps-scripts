var functions = require('firebase-functions');
const Language = require('@google-cloud/language');

exports.analyzeSyntax = functions.https.onRequest((request, response) => {

    const body = JSON.parse(request.body);
    
    // Your Google Cloud Platform project ID
    const projectId = 'example-word-salad-123456';

    // Instantiates a client
    const language = Language({
        projectId: projectId
    });

    // The text to analyze
    const text = body.text;

    // Detects the syntax of the text
    const document = language.document({ content: text});
    
    // Get the origin of the call.
    const origin = request.header('origin');
    console.log('Origin: ' + origin);
    response.setHeader('Access-Control-Allow-Origin', origin)

    if (origin != 'https://www.beaupedraza.com') {
        console.log('Invalid Origin');
        response.send([]);
    } else {
        document.detectSyntax()
            .then(results => {
                let myResponse = [];
                let tokens = results[0];
                for (let token of tokens) {
                    if (token.partOfSpeech.tag == 'NOUN') {
                        let verb = tokens[token.dependencyEdge.headTokenIndex];
                        if (verb.partOfSpeech.tag == 'VERB') {
                            let nvPair = verb.lemma.concat(' ', token.lemma).toLowerCase();
                            myResponse.push(nvPair);
                        }
                    };
                }
                response.send(myResponse);
            }
        ).catch(err => {
            console.error('ERROR:', err);
            response.send(err);
        });
    }
});
