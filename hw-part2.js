import http from 'k6/http';
import {check, group} from 'k6';
import {SharedArray} from 'k6/data';
import {Rate} from 'k6/metrics';

const URL_YA = 'http://ya.ru';
const URL_WWW = 'http://www.ru';

const HEADERS_YA = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Cache-Control": "no-cache"
}

const HEADERS_WWW = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Cache-Control": "no-cache"
}

const RATE_YA = 60
const RATE_WWW = 120
const STEP_RATIO = 1.2
const PAUSE_DURATION = "10s"
const PER_TIME = '1m'
const RAMP_STAGE_DURATION = '5m'
const STAGE_DURATION = '10m'


export const options = {
    discardResponseBodies: true,
    noVUConnectionReuse: true,
    scenarios: {
        getYA: {
            executor: 'ramping-arrival-rate',
            exec: 'getYA',
            startRate: RATE_YA,
            timeUnit: PER_TIME,
            preAllocatedVUs: 50,
            stages: [
                {target: 0, duration: PAUSE_DURATION},
                {target: RATE_YA, duration: RAMP_STAGE_DURATION},
                {target: RATE_YA, duration: STAGE_DURATION},
                {target: RATE_YA * STEP_RATIO, duration: RAMP_STAGE_DURATION},
                {target: RATE_YA * STEP_RATIO, duration: STAGE_DURATION},
            ],
        },
        getWWW: {
            executor: 'ramping-arrival-rate',
            exec: 'getWWW',
            startRate: RATE_WWW,
            timeUnit: PER_TIME,
            preAllocatedVUs: 50,
            stages: [
                {target: 0, duration: PAUSE_DURATION},
                {target: RATE_WWW, duration: RAMP_STAGE_DURATION},
                {target: RATE_WWW, duration: STAGE_DURATION},
                {target: RATE_WWW * STEP_RATIO, duration: RAMP_STAGE_DURATION},
                {target: RATE_WWW * STEP_RATIO, duration: STAGE_DURATION},
            ],
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.05'],
        http_req_duration: ['p(95)<300']

    },
};

export function getYa() {
    const response = http.get(
        URL_YA,
        HEADERS_YA
    )
    const openSiteCheck = check(
        response,
        {
            'status code is 200': (r) => r.status === 200
        }
    )
}

export function getSite(myUrl, myHeaders) {
    const myResponse = http.get(
        myUrl,
        myHeaders
    )
    const openSiteCheck = check(
        myResponse,
        {
            'status code is 200': (r) => r.status === 200
        }
    )
}

export function getYA() {
    getSite(URL_YA, HEADERS_YA)
}

export function getWWW() {
    getSite(URL_WWW, HEADERS_WWW)
}
