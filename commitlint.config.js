module.exports = {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    // Dependabot genere des corps de commit avec de longues lignes (liens, changelogs)
    (message) => /Signed-off-by: dependabot\[bot\]/m.test(message),
  ],
};
