import mockedEnv, { RestoreFn } from 'mocked-env';
import type { RunnerContext } from '../interfaces';
import * as teamcity from './teamcity';

const baseMockedFiles = {
  'build.properties': `
build.number=1575
build.vcs.number=ba74e4fe1f1836c067d678acc54b966610f4b59e
build.vcs.number.1=ba74e4fe1f1836c067d678acc54b966610f4b59e
build.vcs.number.CoolProject=ba74e4fe1f1836c067d678acc54b966610f4b59e
teamcity.auth.userId=TeamCityBuildId=61838662
teamcity.build.changedFiles.file=changed.txt
teamcity.build.id=61838662
teamcity.build.properties.file=build.properties
teamcity.build.workingDir=/opt/buildagent/work/74fddc5876447b6b
teamcity.buildConfName=code quality
teamcity.buildType.id=coolproject_codequality
teamcity.configuration.properties.file=configuration.properties
teamcity.projectName=Cool project
teamcity.runner.properties.file=runner.properties
`,
  'configuration.properties': `
branch.name: master
build.counter: 1575
build.number: 1575
build.vcs.number: ba74e4fe1f1836c067d678acc54b966610f4b59e
build.vcs.number.1: ba74e4fe1f1836c067d678acc54b966610f4b59e
build.vcs.number.Name: ba74e4fe1f1836c067d678acc54b966610f4b59e
buildStatus: failed
CHANGE: I6e1d02331da3d7810cb59714feb81f9fac8d132a
docker.build_image: docker-registry/builder
docker.registry: docker-registry
docker.registry-push: docker-registry-push
dockerfile.Name: Dockerfile
git.main.branch: master
teamcity.build.branch: branch
teamcity.build.branch.is_default: false
teamcity.build.id: 61838662
teamcity.build.triggeredBy: Git
teamcity.build.triggeredBy.username: ian
teamcity.build.vcs.branch.CoolProject: refs/heads/branch
teamcity.git.build.vcs.branch.Cool___Project: refs/heads/branch
teamcity.project.id: coolproject
vcsRepoPath: cool/project
vcsroot.branch: refs/heads/master
vcsroot.CoolProject.authMethod: PRIVATE_KEY_DEFAULT
vcsroot.CoolProject.branch: refs/heads/master
vcsroot.CoolProject.teamcity:branchSpec: +:refs/reviews/*\n-:refs/heads/*
vcsroot.CoolProject.url: git@git.repo.com:cool/project.git
vcsroot.CoolProject.useAlternates: true
vcsroot.submoduleCheckout: CHECKOUT
vcsroot.teamcity:branchSpec: +:refs/reviews/*\n-:refs/heads/*
vcsroot.url: git@git.repo.com:cool/project.git
vcsroot.useAlternates: true
`,
};

let mockedFiles = { ...baseMockedFiles };

jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  async readFile(fileName: keyof typeof mockedFiles) {
    return mockedFiles[fileName];
  },
}));

describe('TeamCity', () => {
  let restore: RestoreFn;
  let context: RunnerContext;

  beforeEach(() => {
    restore = mockedEnv(
      {
        TEAMCITY_BUILD_PROPERTIES_FILE: 'build.properties',
      },
      { clear: true }
    );
  });

  afterEach(() => {
    restore();
    mockedFiles = { ...baseMockedFiles };
  });

  describe('context', () => {
    it('should return proper context values for branch', async () => {
      context = await teamcity.context();

      expect(context).toMatchInlineSnapshot(`
        {
          "actor": "ian",
          "eventName": "Git",
          "job": "code quality",
          "payload": {},
          "ref": "refs/heads/branch",
          "runId": 61838662,
          "runNumber": 1575,
          "sha": "ba74e4fe1f1836c067d678acc54b966610f4b59e",
        }
      `);
    });

    it('should return proper context values for gerrit ref', async () => {
      mockedFiles['configuration.properties'] += `
      teamcity.build.vcs.branch.CoolProject: refs/reviews/337733/9
      teamcity.git.build.vcs.branch.Cool___Project: refs/reviews/337733/9
      teamcity.build.branch: 337733/9
      `;
      context = await teamcity.context();

      expect(context).toMatchInlineSnapshot(`
        {
          "actor": "ian",
          "eventName": "Git",
          "job": "code quality",
          "payload": {},
          "ref": "refs/reviews/337733/9",
          "runId": 61838662,
          "runNumber": 1575,
          "sha": "ba74e4fe1f1836c067d678acc54b966610f4b59e",
        }
      `);
    });
  });

  describe('repo', () => {
    it('should return proper repo values for git', async () => {
      const repo = await teamcity.repo();

      expect(repo).toMatchInlineSnapshot(`
        {
          "default_branch": "master",
          "description": "",
          "html_url": "https://git.repo.com/cool/project",
          "license": null,
          "name": "Cool project",
        }
      `);
    });

    it('should return proper repo values for gerrit', async () => {
      mockedFiles['configuration.properties'] += `
      vcsroot.CoolProject.url: ssh://gerrit.repo.com:29418/cool/project
      vcsroot.url: ssh://gerrit.repo.com:29418/cool/project
      version: gerrit
      `;

      const repo = await teamcity.repo();

      expect(repo).toMatchInlineSnapshot(`
        {
          "default_branch": "master",
          "description": "",
          "html_url": "https://gerrit.repo.com/q/project:cool%2Fproject",
          "license": null,
          "name": "Cool project",
        }
      `);
    });
  });
});
