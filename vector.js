function Vector(x, y) {
	if (x instanceof Vector) {
		this.x = x.x;
		this.y = x.y;
		return;
	}
	this.x = x || 0;
	this.y = y || 0;
}

Vector.prototype.add = function (x, y) {
	if (x instanceof Vector) {
		this.x += x.x;
		this.y += x.y;
		return this;
	}
	this.x += x;
	this.y += y;
	return this;
};

Vector.prototype.sub = function (x, y) {
	if (x instanceof Vector) {
		this.x -= x.x;
		this.y -= x.y;
		return this;
	}
	this.x -= v.x;
	this.y -= v.y;
	return this;
};

Vector.prototype.mul = function (n) {
	this.x *= n;
	this.y *= n;
	return this;
};

Vector.prototype.dot = function (x, y) {
	if (x instanceof Vector)
		return this.x * x.x + this.y * x.y;
	return this.x * x + this.y * y;
};

Vector.prototype.angle = function () {
	return Math.atan2(this.y, this.x);
};

Vector.prototype.mag = function () {
	return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vector.add = function (a, b) { return new Vector(a).add(b); }
Vector.sub = function (a, b) { return new Vector(a).sub(b); }
Vector.angle = function (a, b) { return b.angle() - a.angle(); }
