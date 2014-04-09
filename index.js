var fs = require('fs'),
    irc = require('irc'),
    level = require('level'),
    markov = require('markov'),
    db = level('./db', {valueEncoding: 'json'});

function nop() {}

function Markbot(channel, nickname, server, ircConstructor) {
  if (!server) {
    server = 'chat.freenode.net';
  }

  // inject irc constructor
  if (!ircConstructor) {
    ircConstructor = irc;
  }

  this.nickname = nickname;
  this.channel = channel;

  this._client = new ircConstructor.Client(server, nickname, {
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

Markbot.prototype._recordForUser = function(userName, text, cb) {
  if (!cb) {
    cb = nop;
  }

  db.get(userName, function(err, data) {
    if ((err && err.notFound) || data == undefined) {
      data = [];
    }
    else if (err) {
      return cb(err);
    }

    data.push(text);
    db.put(userName, data, cb);
  });
};

Markbot.prototype._getTextForUser = function(userName, cb) {
  db.get(userName, cb);
};

Markbot.prototype.sayForUser = function(userName, limit, cb) {
  if (typeof limit == 'function') {
    cb = limit;
    limit = 10;
  }

  var m = markov(1),
      self = this;

  db.get(userName, function(err, userText) {
    if (err) {
      if (err.notFound) {
        self._client.say(self.channel, 'Nothing yet for ' + userName + '.');
        return cb();
      }
      else {
        console.error('got an error trying to get T_T', err);
        return cb(err);
      }
    }

    userText = userText.join(' ');

    m.seed(userText, function() {
      var firstWord = m.pick(),
          rest = m.forward(firstWord, limit),
          text = [userName, 'says', firstWord].concat(rest).join(' ');
      self._client.say(self.channel, text);

      cb(null, text);
    });
  });
};

module.exports = Markbot;
