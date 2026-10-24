// Speaker script. Each slide: target seconds, and one paragraph per step (step k is spoken after the k-th press of →).
const NOTES = [
  { t: 20, p: [
    "Hello everyone. Our project asks a simple business question: when a bank runs a phone campaign, who should it call first? We compared nine machine-learning models on real telemarketing data to find out."
  ]},
  { t: 50, p: [
    "The data comes from a Portuguese bank’s phone campaigns. Out of 45,211 customers, only 11.7 percent subscribed to a term deposit. Those are the solid dots here.",
    "Now imagine a model that simply predicts “no” for every customer. Its accuracy is 88.3 percent, which sounds excellent. But it finds zero subscribers, and subscribers are the only thing the bank cares about. So in this project we don’t judge models by accuracy. We judge them by how well they rank likely subscribers, and how many they find within a realistic calling budget."
  ]},
  { t: 55, p: [
    "Each record has 16 inputs: the customer’s profile, account and loan details, contact information, and history from earlier campaigns. Everything in this panel is known before the bank picks up the phone. The dataset also records call duration, and it’s by far the strongest predictor.",
    "But look where it sits on the timeline. Duration only exists after the call has ended, and the bank has to decide whom to call before dialling. Using it would let the outcome leak into the prediction, so we removed it from every main model. We also recoded pdays equal to minus one, which means “never contacted”, as its own flag instead of treating it as a number of days."
  ]},
  { t: 60, p: [
    "To compare nine models fairly, they all shared one framework. A stratified 80/20 split gave about 36,000 training records and 9,043 test records, with 1,058 subscribers in the test set. Hyperparameters were chosen by five-fold cross-validation using average precision, and each decision threshold came from training predictions only, never from the test set.",
    "We then asked four questions. Does the model rank subscribers above everyone else? That’s average precision and ROC AUC. Once we draw a line, are the yes-or-no calls good? That’s precision, recall and F1. Are the probabilities themselves accurate? That’s the Brier score. And the business question: if the bank can only call its top 10 or 20 percent, what share of all subscribers does it reach? We call that capture."
  ]},
  { t: 50, p: [
    "We tested nine models in three families. In blue, the traditional baselines: logistic regression, a calibrated linear SVM, and k-nearest neighbours. In orange, random forest and two neural networks: a multilayer perceptron, and a TabTransformer, which uses attention to learn how the categorical fields relate to each other. In green, boosting: AdaBoost, XGBoost and CatBoost, which build trees one after another, each correcting the last. These colours stay the same for the rest of the talk."
  ]},
  { t: 65, p: [
    "Here are the test results, starting with average precision, our main ranking measure. Tree ensembles take the top three places, and XGBoost leads at 0.47, against 0.41 for logistic regression.",
    "Switch to F1, and CatBoost moves into first place.",
    "On recall, random forest wins. It finds 584 of the 1,058 subscribers, but it also flags 729 customers who don’t subscribe.",
    "On precision, the calibrated SVM comes out on top. It is the most selective, but it misses more subscribers.",
    "And with a 20 percent calling budget, CatBoost captures the largest share. So there is no single best model. The right choice depends on what the bank wants to optimise."
  ]},
  { t: 45, p: [
    "You might expect the neural networks to win. They did beat all three traditional baselines, but neither beat random forest.",
    "To check this wasn’t noise, we bootstrapped the test predictions. For both neural networks, the whole 95 percent interval of the difference from random forest sits below zero. Between the two neural networks the interval crosses zero, so there is no clear winner there. One caveat: each neural model had only four tuning candidates, so this is about these settings, not neural networks in general."
  ]},
  { t: 60, p: [
    "Now the result that matters most to a bank. Each dot is one of the 1,058 subscribers in our test set.",
    "If the bank calls 10 percent of customers at random, that’s 904 calls, and it reaches about 106 of them.",
    "If it calls the top 10 percent ranked by XGBoost, it reaches 475. That’s 45 percent of all subscribers, about four and a half times better than random, with exactly the same number of calls.",
    "With a 20 percent budget, XGBoost reaches about 63 percent. Capture here means the share of all subscribers on the call list, not the share of called customers who say yes."
  ]},
  { t: 50, p: [
    "So what is XGBoost looking for? This SHAP plot shows each feature’s contribution for every test customer. Red means a high value, and points to the right push the prediction towards subscribing.",
    "A successful outcome in a previous campaign is the strongest push towards yes.",
    "An unknown contact method pushes the prediction down.",
    "And customers who have already been called many times in this campaign are less likely to subscribe. These are associations, not causes. Less interested customers may simply get more calls."
  ]},
  { t: 50, p: [
    "Remember the feature we removed. Here is XGBoost without call duration.",
    "Now switch it on. Average precision jumps from 0.47 to 0.62, and capture in the top 20 percent rises from 63 to 82 percent. It’s tempting.",
    "But duration is only known once the call has ended, so it can’t help decide whom to call. That’s why every result you’ve seen today excludes it. A model that looks better on paper is no use if its inputs don’t exist at decision time."
  ]},
  { t: 40, p: [
    "So our recommendation: take XGBoost forward for further testing. It had the best ranking and the best capture at a 10 percent budget. If the bank can call 20 percent of customers, CatBoost is a close alternative. And if missing a subscriber is very costly, random forest finds the most. In practice, with a fixed calling capacity, the bank should call down a ranked list rather than use one probability cut-off. And to maximise profit, the rule needs call costs and deposit value."
  ]},
  { t: 40, p: [
    "We should be clear about the limits. We used one dataset and one random split, and earlier versions of the project had already looked at the test set. Tuning budgets differed, and we didn’t repeat runs across seeds. The gap between XGBoost and CatBoost isn’t decisive. And predicting who subscribes is not the same as proving that a call causes a subscription. The next step is to test the shortlist on a fresh, later campaign."
  ]},
  { t: 15, p: [
    "To sum up: the best model depends on the bank’s goal, and a good ranking can reach almost half of all subscribers with a tenth of the calls. Thank you, we’re happy to take questions."
  ]}
];
