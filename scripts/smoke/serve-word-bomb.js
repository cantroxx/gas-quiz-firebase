"use strict";
const { serve } = require("./word-bomb-test-server");
serve()
  .then((server) => {
    console.log("Word Bomb local preview: " + server.url + "/word-bomb/");
    console.log(
      "Bot practice is available. Online play is tested separately against demo emulators.",
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
