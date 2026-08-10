import http from 'k6/http';
import { check, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Rate } from 'k6/metrics';


const URL_1 = 'http://webtours.load-test.ru:1080';
const URL_2 = 'http://ya.ru';
const URL_3 = 'http://www.ru';
const checkFailureRate = new Rate('otus_check_failure_rate');

const data = new SharedArray('get Users', function () {
  const file = JSON.parse(open('./users.json'));
  return file.users;
  });

const random = Math.floor(Math.random() * data.length);

var headers = {
    "Accept" : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language" : "en-US,en;q=0.9",
    "Accept-Encoding" : "gzip, deflate",
    "Connection" : "Keep-Alive",
    "Content-Type" : "text/html; charset=ISO-8859-1",
    "Cache-Control": "no-cache"
}

// (`${BASE_URL}/api/tools`)

export function login() {
  const initParams = {
    headers,
    tags: { my_tag: 'webtours-login' }
  };

  const resInit = http.get(`${URL_1}/webtours/`, initParams);
  const checkResInit = check(
    resInit,
    { 'init status code messages is 200': (resInit) => resInit.status === 200 },
    { my_tag: 'check webtours' },
  );
  checkFailureRate.add(!checkResInit);

  const responseHeader = http.get(`${URL_1}/webtours/header.html`, initParams);
  const checkRespHeader = check(
      responseHeader,
      {
          'header status code is 200': (r) => r.status === 200
      },
      { my_tag: 'check webtours' }
  );

  const signOffParam = 'true';
  const urlWelcome = `${URL_1}/cgi-bin/welcome.pl?signOff=${signOffParam}`
  const responseWelcome = http.get(urlWelcome, initParams);
  const checkResGetCookie = check(
    responseWelcome,
    {
      'welcome status code is 200': (r) => r.status === 200,
      "has cookie 'Set-Cookie'": (r) => r.headers['Set-Cookie'] !== undefined,
    },
    { my_tag: 'check webtours' }
  );
  checkFailureRate.add(!checkResGetCookie);

  const inParam = 'home';
  const navHomeURL = `${URL_1}/cgi-bin/nav.pl?in=${inParam}`
  const responseNavHome = http.get(navHomeURL,initParams)
  const checkResNavHome = check(
      responseNavHome,
      {
          'nav-home status code is 200': (r) => r.status === 200,
          "userSession in response": (r) => r.body.includes("userSession"),
      },
      { my_tag: 'check webtours' }
  );
  const userSession = responseNavHome.html().find('input[name="userSession"]').attr("value")

    const credentials = data[random];
  const loginPayload = {
      username: credentials.username,
      password: credentials.password,
      userSession: userSession,
      "login.x" :	54,
      "login.y":	11,
      JSFormSubmit:	"off"
  };

  // console.log("loginPayload\n", loginPayload)

  const urlLogin = `${URL_1}/cgi-bin/login.pl`
  const resLogin = http.post(
      urlLogin,
      JSON.stringify(loginPayload),
      initParams,
      );


  const checkResLogin = check(
      resLogin,
        {
            'login status code is 200': (r) => r.status === 200,
            "Password correct?": (r) => r.body.toString().includes('User password was correct'),
        },
        { my_tag: 'check webtours' }
    );



}


export default function () {
  group('login', () => { login(); });
}

//Scenario 1

// GET http://webtours.load-test.ru:1080/WebTours/home.html 
// response contains - To make reservations,please enter your account information to the left
// check(res, {
//     'verify homepage text': (r) =>
//       r.body.includes('Collection of simple web-pages suitable for load testing'),
//   });

// GET http://webtours.load-test.ru:1080/cgi-bin/nav.pl?page=menu&in=home 
// <title>Web Tours Navigation Bar</title>


// POST http://webtours.load-test.ru:1080/cgi-bin/login.pl HTTP/1.1
// userSession	144688.675253139HttctcDpHDDDDDDDttzftpftct
// username	efim2
// password	pass2
//// login.x	54
//// login.y	11
//// JSFormSubmit	off
// response - User password was correct


// GET http://webtours.load-test.ru:1080/cgi-bin/nav.pl?page=menu&in=home 
// <title>Web Tours Navigation Bar</title>


// GET http://webtours.load-test.ru:1080/cgi-bin/login.pl?intro=true 
// Don't forget to sign off


// GET http://webtours.load-test.ru:1080/cgi-bin/welcome.pl?page=search HTTP
// User has returned to the search page.  


// GET http://webtours.load-test.ru:1080/cgi-bin/nav.pl?page=menu&in=flights 
// <title>Web Tours Navigation Bar</title>


// GET http://webtours.load-test.ru:1080/cgi-bin/reservations.pl?page=welcome 
// response -   <option selected="selected" value="Denver">Denver</option>
//              <option value="Frankfurt">Frankfurt</option>


// POST /cgi-bin/reservations.pl HTTP/1.1
// seatType	Coach
// seatPref	None
// returnDate	08/10/2026
// numPassengers	1
//// findFlights.y	10
//// findFlights.x	60
// departDate	08/09/2026
// depart	San Francisco
// arrive	Seattle
// advanceDiscount	0
// .cgifields	roundtrip
// .cgifields	seatType
// .cgifields	seatPref
// response - 
// contains - <!-- From San Francisco (6) To Seattle (7) -->
//<tr bgcolor="#EFF2F7"><td align="center"><input type="radio" name="outboundFlight" value="670;86;08/09/2026" checked="checked" >Blue Sky Air 670<td align="center">8am<td align="center">$ 86</TD></TR><tr bgcolor="#EFF2F7"><td align="center"><input type="radio" name="outboundFlight" value="671;77;08/09/2026">Blue Sky Air 671<td align="center">1pm<td align="center">$ 77</TD></TR><tr bgcolor="#EFF2F7"><td align="center"><input type="radio" name="outboundFlight" value="672;82;08/09/2026">Blue Sky Air 672<td align="center">5pm<td align="center">$ 82</TD></TR><tr bgcolor="#EFF2F7"><td align="center"><input type="radio" name="outboundFlight" value="673;71;08/09/2026">Blue Sky Air 673<td align="center">11pm<td align="center">$ 71</TD></TR></table>


// POST /cgi-bin/reservations.pl HTTP/1.1
// seatType	Coach
// seatPref	None
// reserveFlights.y	7
// reserveFlights.x	37
// outboundFlight	673;71;08/09/2026
// numPassengers	1
// advanceDiscount	0
// response contains <title>Flight Reservation</title>


//POST /cgi-bin/reservations.pl HTTP/1.1
// response contains <title>Reservation Made!</title>


// GET /cgi-bin/welcome.pl?page=menus HTTP/1.1
//response contains User has returned to the home page


// GET /cgi-bin/nav.pl?page=menu&in=home HTTP/1.1
// response contains <title>Web Tours Navigation Bar</title>


// GET /cgi-bin/login.pl?intro=true HTTP/1.1
// response contains <title>Welcome to Web Tours</title>




//Scenario 2
// http.get('http://ya.ru');
// http.get('http://wwww.ru'); 
// В течение 5 минут разгоняемся до 100% профиля
// В течение 10 минут подаём равномерную нагрузку в 100% профиля
// В течение 5 минут разгоняемся до 120% профиля
// В течение 10 минут подаём 120% профиля
// 100% профиля выглядит так:

// ya.ru = 60 запросов в минуту
// www.ru = 120 запросов в минуту
  