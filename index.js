var fs = require('fs'),
    irc = require('irc'),
    markov = require('markov');

function Markbot(channel, nickname, server) {
  if (!server) {
    server = 'chat.freenode.net';
  }

  this.nickname = nickname;
  this.channel = channel;
  this._userText = {};

  this._client = new irc.Client(server, nickname, {
    channels: [channel]
  });

  this._client.on('message', this.parseMessage.bind(this));
  this._client.on('error', function(err) {
    console.error('got an error T_T', err);
  });
}

Markbot.prototype.parseMessage = function(from, to, text) {
  var userToCopy;
  if (this._isSay(text)) {
    userToCopy = this._isSay(text);
    return this.sayForUser(userToCopy, function() {
      console.log('done!');
    });
  }

  this._recordForUser(from, text);
};

/*
 * Return the user name to mimic if this is a mimic command, or false
 * if this isn't a mimic command.
 */
Markbot.prototype._isSay = function(text) {
  var splits = text.split(' '),
      nickRegExp = new RegExp(this.nickname),
      to = splits[0];

  if (nickRegExp.test(to) && /forge/.test(text)) {
    return text.split(' ')[2];
  }
};

Markbot.prototype._recordForUser = function(userName, text) {
  this._userText[userName] = this._userText[userName] || '';
  this._userText[userName] += text;
};

Markbot.prototype.sayForUser = function(userName, limit, cb) {

  if (typeof limit == 'function') {
    cb = limit;
    limit = 10;
  }

  if (limit === undefined) {
    limit = 10;
  }

  var m = markov(1),
      userText = this._userText[userName],
      self = this;

  if (!userText) {
    return cb(new Error('no text for user ' + userName));
  }


  m.seed(userText, function() {
    var firstWord = m.pick(),
        rest = m.forward(firstWord, limit),
        text = [firstWord].concat(rest).join(' ');
    self._client.say(self.channel, text);
    cb(null, text);
  });
};

module.exports = Markbot;
