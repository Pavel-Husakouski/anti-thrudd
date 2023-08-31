const _ = require('lodash-node');

function Vertex (config) {
	this.system = config.system;
	this.distance = config.distance;
	this.station = config.station;
	this.outgoing = [];
	this.incoming = [];
}

Vertex.prototype.id = function() {
	return this.station;
}

Vertex.prototype.toString = function() {
	return this.id();
}

Vertex.prototype.isTerminal = function() {
	return this.outgoing.length === 0 || this.incoming.length === 0;
}

Vertex.prototype.caption = function() {
	return this.system + '(' + this.station + ')';
}

function Edge(config, vertexA, vertexZ) {
	this.vertexA = vertexA;
	this.vertexZ = vertexZ;
	this.vertexA.outgoing.push(this);
	this.vertexZ.incoming.push(this);
	this.distance = config.distance;
	this.commodity    = config.commodity;
	this.profit       = config.profit;
}

Edge.prototype.id = function() {
	return this.vertexA.id() + ' ' + this.vertexZ.id() + ' ' + this.commodity;
}

Edge.prototype.toString = function() {
	return this.id();
}

Edge.prototype.otherEnd = function(vertex) {
	if(this.vertexA === vertex)
		return this.vertexZ;
	else if(this.vertexZ === vertex)
		return this.vertexA;
	else
		throw new Error('Graph integrity error');
}

Edge.prototype.caption = function() {
	return [this.distance, this.commodity, this.profit].join(' - ');
}

function Loop(route) {
	var chunks = _.chunk(route, 2);

	var first = chunks[0];
	var last =  chunks.slice(-1)[0];

	if(first[0].id() > last[0].id()) {
		this.route = chunks;
	}
	else {
		this.route = chunks.reverse();	
	}
}

Loop.prototype.id = function() {
	return this.route.map(function(chunk) {
		return chunk[0].id() + ' - '+ chunk[1].id();
	}).join(' ');
}

Loop.prototype.caption = function() {
	return this.route.map(function(chunk) {
		return chunk[0].caption() + '\n\t' + chunk[1].caption();
	}).join('\n\t');
}

Loop.prototype.profit = function() {
	var profit = this.route.reduce(function(acc, chunk) {
		return acc + parseInt(chunk[1].profit);
	}, 0);

	return (profit/this.route.length)*2;
}

Loop.prototype.toString = function() {
	return this.id();
}

function findLoops(startVertex) {
	var visited = {};
	var loops = [];
	var currentRoute = [];

	function __find(vertex) {
		if(vertex.isTerminal() || currentRoute.length > 10)
			return;

		if(vertex === startVertex  && visited[startVertex]) {
			var loop = new Loop(currentRoute);

			if(loop.profit() > 2300)
				loops.push(loop);
			return;
		}

		if(visited[vertex]) {
			return;
		}

		visited[vertex] = true;
		currentRoute.push(vertex);

		var edges = vertex.outgoing;

		for(var i = 0; i<edges.length; i++) {
			var edge = edges[i];
			var nextVertex = edge.otherEnd(vertex);

			currentRoute.push(edge);
			__find(nextVertex);		
			currentRoute.pop(edge);
		}

		currentRoute.pop();
		delete visited[vertex];
	}

	__find(startVertex);

	return loops;
}


function analyseNetwork(thruddData) {
	var vertices = selectVertices(thruddData);
	var edges = selectEdges(thruddData, vertices);
	var routes = [];

	for(var i in vertices) {
		if(!vertices.hasOwnProperty(i))
			continue;

		var vertex = vertices[i];
		var loops = findLoops(vertex);

		routes = routes.concat(loops);
	}

	return routes;
}

function selectVertices(parsed) {
	var result = {};

	_.forEach(parsed, function(item){
		var source	    = new Vertex(item.forward.source);
		var destination = new Vertex(item.forward.destination);

		result[source] 		 = source;
		result[destination]  = destination;
	});

	return result;
}

function selectEdges(parsed, vertices) {
	var result = {};

	_.forEach(parsed, function(item){
		var vA = vertices[item.forward.source['station']];
		var vZ = vertices[item.forward.destination['station']];
		var edge = new Edge({
			distance:item.distance,
			commodity:item.forward.commodity,
			profit:item.profit
		},vA,vZ);

		result[edge] = edge;
	});

	return result;
}

module.exports = analyseNetwork;