'use strict';

const { Octokit } = require('@octokit/rest');
const config = require('../config');
const log = require('../logger');

let _octokit = null;
function getOctokit() {
  if (!_octokit) _octokit = new Octokit({ auth: config.github.token });
  return _octokit;
}

async function getFile(path) {
  try {
    const res = await getOctokit().repos.getContent({
      owner: config.github.owner,
      repo:  config.github.repo,
      path,
      ref:   config.github.branch,
    });
    if (Array.isArray(res.data)) throw new Error(`"${path}" — директория, не файл`);
    return {
      content: Buffer.from(res.data.content, 'base64').toString('utf-8'),
      sha: res.data.sha,
    };
  } catch (err) {
    if (err.status === 404) { log.debug({ path }, 'getFile: 404'); return null; }
    throw err;
  }
}

async function createOrUpdateFile({ path, content, message, sha }) {
  const body = {
    owner:   config.github.owner,
    repo:    config.github.repo,
    path,
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch:  config.github.branch,
    committer: config.github.committer,
  };
  if (sha) body.sha = sha;
  const res = await getOctokit().repos.createOrUpdateFileContents(body);
  return { commitSha: res.data.commit.sha, fileSha: res.data.content.sha };
}

module.exports = { getFile, createOrUpdateFile };