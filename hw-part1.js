import http from 'k6/http';
import {check, group} from 'k6';
import {SharedArray} from 'k6/data';
import {Rate} from 'k6/metrics';

const URL_1 = 'http://webtours.load-test.ru:1080';
const URL_2 = 'http://ya.ru';
const URL_3 = 'http://www.ru';
const checkFailureRate = new Rate('otus_check_failure_rate');
const ADVANCE_DISCOUNT = 0;
const SEAT_TYPE = "Coach";
const SEAT_PREF = "None";
const NUM_PASSENGERS = Math.ceil(Math.random() * 4);

const usersData = new SharedArray('get Users', function () {
    const file = JSON.parse(open('./users.json'));
    return file.users;
});

const paymentData = new SharedArray('get payments', function () {
    const file = JSON.parse(open('./payments.json'));
    return file.payments;
});

const format = (d) => d.toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'});

const randomPay = Math.floor(Math.random() * paymentData.length);

let headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "Keep-Alive",
    "Cache-Control": "no-cache"
}

// (`${BASE_URL}/api/tools`)

export function login(credentials) {
    const initParams = {
        headers,
        tags: {my_tag: 'webtours-login'}
    };

    const resInit = http.get(`${URL_1}/webtours/`, initParams);
    const checkResInit = check(
        resInit,
        {'init status code messages is 200': (resInit) => resInit.status === 200},
        {my_tag: 'check webtours'},
    );
    checkFailureRate.add(!checkResInit);

    const responseHeader = http.get(`${URL_1}/webtours/header.html`, initParams);
    const checkRespHeader = check(
        responseHeader,
        {
            'header status code is 200': (r) => r.status === 200
        },
        {my_tag: 'check webtours'}
    );
    checkFailureRate.add(!checkRespHeader);

    const signOffParam = 'true';
    const responseWelcome = http.get(`${URL_1}/cgi-bin/welcome.pl?signOff=${signOffParam}`, initParams);
    const checkResGetCookie = check(
        responseWelcome,
        {
            'welcome status code is 200': (r) => r.status === 200,
            "has cookie 'Set-Cookie'": (r) => r.headers['Set-Cookie'] !== undefined,
        },
        {my_tag: 'check webtours'}
    );
    checkFailureRate.add(!checkResGetCookie);

    const inParam = 'home';
    const responseNavHome = http.get(`${URL_1}/cgi-bin/nav.pl?in=${inParam}`, initParams)
    const checkResNavHome = check(
        responseNavHome,
        {
            'nav-home status code is 200': (r) => r.status === 200,
            "userSession in response": (r) => r.body.includes("userSession"),
        },
        {my_tag: 'check webtours'}
    );
    const userSession = responseNavHome.html().find('input[name="userSession"]').attr("value")
    checkFailureRate.add(!checkResNavHome);

    const loginPayload = {
        username: credentials.username,
        password: credentials.password,
        userSession: userSession
    };
    const urlLogin = `${URL_1}/cgi-bin/login.pl`
    const resLogin = http.post(
        urlLogin,
        loginPayload,
        {headers: {'Content-Type': 'application/x-www-form-urlencoded'}},
    );
    const checkResLogin = check(
        resLogin,
        {
            'login status code is 200': (r) => r.status === 200,
            "Password correct?": (r) => r.body.toString().includes('User password was correct'),
        },
        {my_tag: 'check webtours'}
    );
    checkFailureRate.add(!checkResLogin);
}

export function buyTicket() {
    const ticketParams = {
        headers,
        tags: {my_tag: 'webtours-ticket'}
    };

    const respFlights = http.get(
        `${URL_1}/cgi-bin/nav.pl?page=menu&in=flights`,
        ticketParams
    )
    const checkFlights = check(
        respFlights,
        {
            'flights page status code is 200': (r) => r.status === 200,
            'Web Tours Navigation Bar in title?': (r) => r.body.toString().includes('Web Tours Navigation Bar')
        }
    )
    checkFailureRate.add(!checkFlights);

    const urlReservations = `${URL_1}/cgi-bin/reservations.pl`
    const respGetCities = http.get(
        `${urlReservations}?page=welcome`
    )
    const checkCities = check(
        respGetCities,
        {
            'cities page status code is 200': (r) => r.status === 200,
            'phrase selected=\"selected\" on the page': (r) => r.body.toString().includes('selected=\"selected\"')
        }
    )
    const cities = respGetCities.html().find("option");
    let cityArrive, cityDeparture;
    if (cities.size() >= 2) {
        do {
            const randArriveEl = cities.get(Math.floor(Math.random() * cities.size()));
            const randDepartureEl = cities.get(Math.floor(Math.random() * cities.size()));
            cityArrive = randArriveEl.textContent();
            cityDeparture = randDepartureEl.textContent()
        } while (cityArrive === cityDeparture);
    } else if (cities.size() === 1) {
        cityArrive = cityDeparture = cities.get(0).textContent;
    }
    checkFailureRate.add(!checkCities);

    const dateDeparture = new Date();
    const returnDate = new Date();
    dateDeparture.setDate(dateDeparture.getDate() + 1);
    returnDate.setDate(returnDate.getDate() + Math.ceil(Math.random() * 7) + 1);
    const formattedDeparture = format(dateDeparture);
    const formattedReturn = format(returnDate);
    const cityPayload = {
        seatType: SEAT_TYPE,
        seatPref: SEAT_PREF,
        returnDate: formattedReturn,
        numPassengers: NUM_PASSENGERS,
        departDate: formattedDeparture,
        depart: cityDeparture,
        arrive: cityArrive,
        advanceDiscount: ADVANCE_DISCOUNT,
        '.cgifields': "roundtrip",
        'findFlights.x': 60,
        'findFlights.y': 10,
    };
    const respGetTickets = http.post(
        `${urlReservations}`,
        cityPayload,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    )
    const checkTicket = check(
        respGetTickets,
        {
            'ticket status code is 200': (r) => r.status === 200,
            "cityDeparture in response": (r) => r.body.toString().includes(`${cityDeparture}`),
            "cityArrive in response": (r) => r.body.toString().includes(`${cityArrive}`)
        }
    )
    checkFailureRate.add(!checkTicket);
    const tickets = respGetTickets.html().find("input[name='outboundFlight']");
    const randomTicket = Math.floor(Math.random() * tickets.size());
    const ticket = tickets.attr('value', randomTicket);

    // const tickets = respGetTickets.html().find("input[name='outboundFlight']")
    // console.log(tickets)
    // const ticket = tickets.get(Math.floor(Math.random() * tickets.length))


    // const tickets = respGetTickets.html().find("input[name='outboundFlight']").
    // console.log("tickets", tickets)
    // const ticket = tickets.get(Math.floor(Math.random() * tickets.length)).textContent()

    const paymentPayload = {
        seatType: SEAT_TYPE,
        seatPref: SEAT_PREF,
        outboundFlight: ticket,
        numPassengers: NUM_PASSENGERS,
        advanceDiscount: ADVANCE_DISCOUNT,
        'reserveFlights.x': 37,
        'reserveFlights.y': 7
    }
    const respGetPayment = http.post(
        `${urlReservations}`,
        paymentPayload,
        {headers: {'Content-Type': 'application/x-www-form-urlencoded'}},
    )
    const checkPayment = check(
        respGetPayment,
        {
            'get payment status code is 200': (r) => r.status === 200,
            'get payment title check': (r) => r.body.toString().includes("Flight Reservation")
        }
    )
    checkFailureRate.add(!checkPayment)


    const payment = paymentData[randomPay];
    ``
    const summarizePayload =
        {
            firstName: payment.firstName,
            lastName: payment.lastName,
            address1: payment.address1,
            address2: payment.address2,
            pass1: `${payment.firstName} ${payment.lastName}`,
            creditCard: payment.creditCard,
            expDate: payment.expDate,

            numPassengers: NUM_PASSENGERS,
            seatType: SEAT_TYPE,
            seatPref: SEAT_PREF,
            outboundFlight: ticket,
            advanceDiscount: ADVANCE_DISCOUNT,
            returnFlight: "",
            'buyFlights.x': 65,
            'buyFlights.y': 13
        }
    const respPaymentSuccess = http.post(
        `${urlReservations}`,
        summarizePayload,
        {headers: {'Content-Type': 'application/x-www-form-urlencoded'}},
    )
    const successCheck = check(
        respPaymentSuccess,
        {
            'success status is 200': (r) => r.status === 200,
            'success title is ok?': (r) => r.body.toString().includes("Reservation Made!")
        }
    )
    checkFailureRate.add(!successCheck);
}

export function returnToHomePage(credentials) {

    const returnHomeParams = {
        headers,
        tags: {my_tag: 'webtours-home-page'}
    };

    const respNavigateHome = http.get(
        `${URL_1}/cgi-bin/nav.pl?page=menu&in=home`,
        returnHomeParams
    )
    const checkReturnHome = check(
        respNavigateHome,
        {
            'return home status code is 200': (r) => r.status === 200,
            'Web Tours Navigation Bar in title?': (r) => r.body.toString().includes('Web Tours Navigation Bar')
        }
    )
    checkFailureRate.add(!checkReturnHome);

    const respOpenHome = http.get(
        `${URL_1}/cgi-bin/login.pl?intro=true`,
        returnHomeParams
    )
    const checkOpenHome = check(
        respOpenHome,
        {
            'open home status code is 200': (r) => r.status === 200,
            'contains Welcome username?': (r) => r.body.toString().includes(`Welcome, \<b\>${credentials.username}\<\/b\>`)
        }
    )
    checkFailureRate.add(!checkOpenHome)
}


export default function () {
    const randomCred = Math.floor(Math.random() * usersData.length);
    const credentials = usersData[randomCred];

    group('login', () => {
        login(credentials);
    });
    group('buyTicket', () => {
        buyTicket(credentials);
    });
    group('returnToHomePage', () => {
        returnToHomePage(credentials);
    });
}

//Scenario 1


// GET /cgi-bin/welcome.pl?page=menus HTTP/1.1
//response contains User has returned to the home page


// GET /cgi-bin/nav.pl?page=menu&in=home HTTP/1.1
// response contains <title>Web Tours Navigation Bar</title>


// GET /cgi-bin/login.pl?intro=true HTTP/1.1
// response contains Welcome, efim2


