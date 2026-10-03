(function (global) {
  'use strict';
  global.LiberJournalText = function (entry) {
    const data = entry || {};
    for (const key of ['text', 'body', 'excerpt', 'name', 'kind']) {
      const value = data[key];
      if (value == null) continue;
      if (typeof value !== 'string') throw new TypeError('journal ' + key + ' must be a string');
      if (key === 'text' || value !== '') return value;
    }
    return '';
  };
  global.LiberJournalLabel = function (label, entry) {
    const data = entry || {};
    return data.kind === 'spoken' && data.traveller === 'the mad scribe'
      && label === 'the mad scribe asked' ? 'riason asked' : label;
  };
})(window);
