import whatsapi from 'whatsapi';
import moment from 'moment';
import R from 'ramda';

export function login(credentials, fn){

    const wa = whatsapi.createAdapter({
        msisdn: credentials.phone, // phone number with country code
        username: credentials.username, // your name on WhatsApp
        password: credentials.password, // WhatsApp password
        ccode: credentials.ccode // country code
    });

    wa.connect(error => {

        if (error) throw new Error('Could not connect');

        // Now login
        wa.login(error => {

            if (error) throw new Error('Could not login in');

            wa.sendIsOnline();

            wa.on('receivedMessage', fn);

        });
    });

    process.on('SIGINT', _ => wa.disconnect());
    process.on('exit', _ => wa.disconnect());
}

export function listen(config, fn){

    return message => {

        const filterMessage = filter(message, config);

        isFunction(fn) ? fn(filterMessage) : display(filterMessage);
    }
}

export function filter(message, config){

    return !message ? false : dispatch(getRules(getSenderPhone(message), config), message)
}

function display(message){

    if(message) print(message);
}

function print(message){

    const date = getDate(message);
    const text = getText(message);
    const author = getAuthor(message);

    console.log(`[${date}] ${author} says: ${text}`);
}

function getText(message){

    return message.body;
}

function getDate(message){

    return moment(message.date).format('DD-MM, HH:mm:ss');
}

function getAuthor(message){

    return message.author || message.notify || getSenderPhone(message);
}

function getSenderPhone(message){

    return (message.from || '').replace(/\@.*$/, '');
}

function getRules(from, config){

    return config[from] || (config['*'] === '*' ? {'*':'*'} : config['*']);
}

function dispatch(rules, message){

    if(!rules) return false;

    const rulesResult = [for (rule of R.keys(rules)) applyRule(rule)(rules[rule], getText(message))];

    return R.any(x => x === true, rulesResult) ? message : false;
}

function isFunction(functionToCheck) {

    const getType = {};

    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';

}

function applyRule(rule){

    if(rule.toLowerCase() === 'only'){

        return applyOnly;
    }

    if(rule.toLowerCase() === 'ignore'){

        return applyIgnore;
    }

    if(rule.toLowerCase() === '*'){

        return _ => true;
    }

    return _ => false;
}

function applyOnly(filter, message){

    if(R.is(String, filter)) return R.test(new RegExp(filter), message);

    if(R.isArrayLike(filter)) return R.any(x => R.test(new RegExp(x), message), filter);
}

function applyIgnore(filter, message){

    return !applyOnly(filter, message);
}