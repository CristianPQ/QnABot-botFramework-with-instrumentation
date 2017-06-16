
var restify = require('restify');
var builder = require('botbuilder');
var cognitiveservices = require('botbuilder-cognitiveservices');
var instrumentation = require('botbuilder-instrumentation');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
 appId: process.env.MICROSOFT_APP_ID,
 appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Setting up advanced instrumentation
//=========================================================
let logging = new instrumentation.BotFrameworkInstrumentation({ 
  instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
  sentimentKey: process.env.CG_SENTIMENT_KEY,
});
logging.monitor(bot);


//=========================================================
// Bots Dialogs
//=========================================================

var recognizer = new cognitiveservices.QnAMakerRecognizer({
	knowledgeBaseId: process.env.QNAMAKER_KBID, 
	subscriptionKey: process.env.QNAMAKER_SUBSCRIPTION_KEY});
	
var basicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({
	recognizers: [recognizer],
	defaultMessage: 'No match! Try changing the query terms!',
	qnaThreshold: 0.3
});

basicQnAMakerDialog.defaultWaitNextMessage = function(session, qnaMakerResult){
	if(session.privateConversationData.qnaFeedbackUserQuestion != null && qnaMakerResult.answers != null && qnaMakerResult.answers.length > 0 
		&& qnaMakerResult.answers[0].questions != null && qnaMakerResult.answers[0].questions.length > 0 && qnaMakerResult.answers[0].answer != null){
			console.log('User Query: ' + session.privateConversationData.qnaFeedbackUserQuestion);
			console.log('KB Question: ' + qnaMakerResult.answers[0].questions[0]);
			console.log('KB Answer: ' + qnaMakerResult.answers[0].answer);
      console.log('Score: ' + qnaMakerResult.answers[0].score);
      //trackQNAEvent(context, userQuery, kbQuestion, kbAnswer, score)
      logging.trackQNAEvent(session,
        session.privateConversationData.qnaFeedbackUserQuestion,
        qnaMakerResult.answers[0].questions[0],
        qnaMakerResult.answers[0].answer,
        qnaMakerResult.answers[0].score);
		}
	session.endDialog();
}

bot.dialog('/', basicQnAMakerDialog);
