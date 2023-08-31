const tuco = require('tuco');

function toString(x){ 
	if(x == null || typeof x == 'string')
		return x;
	return x.join(''); 
}

function join(ch) {
	return function(x) {
		if(x == null)
			return '';

		return x.join(ch);
	}
}

function thruddParser(text) {
	eval(tuco.nsImport('tuco')); // an import

/*
    thrudd  > row{row}
    row > tradeData trail
	tradeData > system space '(' station ')' distanceToStation commodity '>' system '(' station ')' distanceToStation details
	trail > (prompt | tradeData) distanceBetweenPlanets profit
	details > buy sell
	buy     > 'Buy:' price '(' time ')'
	sell    > 'Sell:' price '(' time ')'
	price   > number
	prompt  > 'Find Return Commodity' | 'No profitable return trade.'
	distanceToStation > number 'ls'
	distanceBetweenPlanets > number
	profit  > number
	time >  [[number 'd'] [number 'h']] number 'm' ago
	system > (letter | digit) {any except '('}
	station > letter any except ')'
	number > digit{digit}
	*/
	const ignore = function(parser){
		return optional(parser).map(function(){
			return null;
		});
	}

	const skip = function(parser){
		return parser.map(function(){
			return null;
		});
	}

	const last = function() {
		return function(x){
			return x.slice(-1)[0];
		}
	}

	const letter   = charMeets(function(ch) { return ch.toUpperCase() >= 'A' && ch.toUpperCase() <= 'Z' });
	const dash 	= charIs('-');
	const plus 	= charIs('+');
	const apostrophe 	= charIs("'");
	const dot 		= charIs('.');
	const digit 	= charOneOf("0123456789");
	const number 	= rep1(digit).map(toString);
	const day      = all(number, "d").map(toString);
	const hour     = all(number, "h").map(toString);
	const minute   = all(number, "m").map(toString);
	const space    = charIs(' ');
	const letterOrDigit = or(letter, digit);
	const _ = ignore(' ');

	const distance = all(number, optional(dot, number).map(toString)).map(toString);

	let nameTrailImpl = null;
	const nameTrail = function(x) { return nameTrailImpl(x); };

	nameTrailImpl = all(optional(or("' ", apostrophe, space, dash, plus, dot)), letterOrDigit, optional(nameTrail), optional(space)).map(toString);

	const name = all(letterOrDigit, nameTrail).map(toString);

	const commodity = name;
	const station 	= name;
	const systemName = name;
	const time = first( all(optional(optional(day, _).map(toString), all(hour, _).map(toString)).map(join(' ')),  minute), all(_, 'ago')).map(join(' '));
	const profit = number;
	const price = number;
	const distanceBetweenPlanets = distance;
	const distanceToStation = all(distance, 'ls').map(toString);
	const prompt = or(' Find Return Commodity', ' No profitable return trade. ').map(toString);
	const priceAndTime = all(price, _, between('(',time,')')).map(function(x) {
		return {
			price:x[0],
			time:x[2]
		}
	});

	const details = all(second('Buy: ', priceAndTime), _, second('Sell: ', priceAndTime)).map(function(x){
		return {
			buy:x[0],
			sell:x[2]
		};
	});

	const system = all(systemName, _, between('(',station,')'), _, distanceToStation).map(function(x) {
		return {
			system:x[0],
			station:x[2],
			distance:x[4]
		};
	});


	const tradeData = all(system, _, commodity, _, anyChar(), _, system, _, details).map(function(x){
		return {
			source:x[0],
			commodity:x[2],
			destination:x[6],
			buy:x[8].buy,
			sell:x[8].sell
		};
	});

	const trail = all(or(skip(prompt), tradeData),  _, distanceBetweenPlanets, _, profit);
	const row = all(tradeData, _, trail, _).map(function(x) { 
		const data = x[0];
		const trail = x[2];

		return {
			forward:data,
			backward:trail[0],
			distance : trail[2],
			profit : trail[4]
		};
	});
	const thrudd = rep1(row);

	const result =  thrudd(text);

	return result;
}

module.exports = thruddParser;