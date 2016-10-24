import ReactDOM = require("react-dom");
import {h, Result, Success, Failure, mapResult, mapHeadEntry, patch} from './lib';

// Start

const masterRef = 'master'

const getRef = (origin: string): Promise<Result<string>> => {
    return fetch(`${origin}/api/config/version`)
        .then((response): Promise<Result<string>> => (
            response.ok
                ? response.json().then((json: string) => new Success(json))
                : response.json().then((json: string) => new Failure(json))
        ))
}


// Config
declare global {
    class URLSearchParams extends Map<string, string> {
        constructor(search: string)
    }
}

const urlSearchParams = new URLSearchParams(window.location.search);
const gitHubApiUrl = 'https://api.github.com/repos/paulaanhaanen/cubik-app';
const keyToOriginJson = urlSearchParams.get('keyToOrigin');
const keyToOriginPairs: [ [ string, string ] ] = JSON.parse(decodeURIComponent(keyToOriginJson || ''))
const keyToOrigin: Map<string, string> = new Map(keyToOriginPairs);
const username = urlSearchParams.get('username')
const password = urlSearchParams.get('password');

const missing = [
    ['username', username],
    ['password', password],
]
    .filter(([ , value ]) => !value)
    .map(([ key ]) => key).join(', ')

if (!username || !password) {
    throw new Error(`Missing query params: ${missing}`)
}

type GitHubCommitJson = {
    commit: {
        message: string
    },
    html_url: string
}
type GitHubCompareJson = { commits: GitHubCommitJson[] }
type GitHubErrorJson = { message: string }
const getCommits = (baseRef: string) => (
    fetch(`${gitHubApiUrl}/compare/${baseRef}...${masterRef}`, {
        headers: {
            'Authorization': 'Basic '+btoa(`${username}:${password}`),
        },
    })
        .then((response): Promise<Result<GitHubCompareJson>> => (
            response.ok
                ? response.json().then((json: GitHubCompareJson) => new Success(json))
                : response.json().then((json: GitHubErrorJson) => new Failure(json.message))
        ))
        .then(result => (
            mapResult(result, gitHubCompareJson => (
                gitHubCompareJson.commits.map((githubCommitJson): Commit => (
                    {
                        message: githubCommitJson.commit.message,
                        htmlUrl: githubCommitJson.html_url,
                    }
                ))
            ))
        ))
);

type Commit = {
    message: string,
    htmlUrl: string
}
type State = {
    baseKey?: string
    baseRefResult?: Result<string>
    commitsResult?: Result<Commit[]>
}
const render = (state: State) => (
    h('div', {}, [
        h('select', {
            onChange: event => {
                const baseKey = (<HTMLSelectElement>event.target).value;
                updateDom(patch(state, { baseKey }))
                loadCommits();
            },
            defaultValue: state.baseKey
        }, Array.from(keyToOrigin.keys()).map(key => (
            h('option', {}, [ key ])
        ))),
        h('h1', {}, [`${state.baseKey}...master`]),
        !!state.commitsResult && state.commitsResult.success && h('ul', {}, state.commitsResult.value.map(commit => (
            h('li', {}, [
                h('a', { href: commit.htmlUrl }, [commit.message])
            ])
        )))
    ])
);

const rootEl = document.querySelector('#root');

let state: State = {
    // TODO: Why isn't index lookup string | undefined?
    baseKey: mapHeadEntry(keyToOrigin)[0]
};
const updateDom = (newState: State) => {
    state = newState;
    console.log(state)
    return ReactDOM.render(render(state), rootEl)
};
updateDom(state)

const loadCommits = async () => {
    // flatMap
    const baseOrigin = state.baseKey !== undefined ? keyToOrigin.get(state.baseKey) : undefined;
    // map
    const baseRefResult = baseOrigin !== undefined ? await getRef(baseOrigin) : undefined;
    // filter + map
    const commitsResult = baseRefResult !== undefined && baseRefResult.success ? await getCommits(baseRefResult.value) : undefined;
    // TODO: Update commits sync
    const newState = patch(state, { commitsResult, baseRefResult })
    updateDom(newState)
}

// const go = () => {
async function go () {
    const scheduleNext = () => setTimeout(go, 60e3);
    loadCommits();
    scheduleNext();
};

go();
