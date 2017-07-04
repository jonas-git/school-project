const DEBUG = 1;
var DEBUG_CANVAS, DEBUG_CTX;
if (DEBUG) {
	DEBUG_CANVAS = document.getElementById("debug-canvas");
	DEBUG_CTX = DEBUG_CANVAS.getContext('2d');
	DEBUG_CANVAS.width  = window.innerWidth;
	DEBUG_CANVAS.height = window.innerHeight;
}

// Convert radians to degrees.
function degrees(radians) {
	return radians / Math.PI * 180;
}

// Make radians positive. 
function radiansPositive(radians) {
	return radians > 0 ? radians : 2 * Math.PI + radians;
}

function lerp(value1, value2, amount) {
	amount = amount < 0 ? 0 : amount;
	amount = amount > 1 ? 1 : amount;
	return value1 + (value2 - value1) * amount;
}

/* - imageSource:  Path or URL to an image of the wheel.
 * - axisX, axisY: The coordinates of the wheel's axis (center).
 * - container:    An object that can contain the following optional properties:
 *    - container: A DIV element in which the wheel canvas should be put.
 *                   If not supplied, a new element will be created.
 *    - onSteer:   A function that is called when the wheel is steered.
 *    - radius:    The radius of the wheel to determine where clicking is allowed.
 *                   If not supplied, the whole page can be clicked/tapped to steer.
 */
function Wheel(imageSource, axisX, axisY, options) {
	const self = this;

	const container = options.container ? options.container : document.createElement('div');
	const canvas = document.createElement('canvas');
	container.className = canvas.className = 'wheel';
	container.ondragstart = function () { return false; };

	// Ensure that the wheel axis is in the center
	// of the canvas, so that rotation is done properly.
	canvas.height = axisY * 2;
	canvas.width = axisX * 2;

	// Draw the wheel image to the canvas
	const image = new Image();
	image.src = imageSource;
	image.onload = function () {
		const context = canvas.getContext('2d');
		context.drawImage(this, 0, 0, this.width, this.height);
	};

	container.appendChild(canvas);
	if (!options.container)
		document.body.appendChild(container);

	this.radius = options.radius;
	this.onSteerFunc = options.onSteer;

	this.angle = 0;
	this.desiredAngle = 0;
	this.currentAngle = 0;
	this.dragging = false;
	this.dragPoint = new Vector(); // Point where the user started dragging.
	this.rotationPoint = new Vector(); // Point of rotation in the document.
	this.originToBegin = null;
	this.canvas = canvas;

	// Once the document is loaded the state of the wheel can be updated,
	// because it needs the `clientWidth` attribute of the canvas element.
	document.addEventListener("DOMContentLoaded", function () { self.update(); });

	// Update the rotation point and the centering
	// of the canvas when the window is resized.
	window.addEventListener('resize', function () { self.update(); });

	window.addEventListener('mousedown', function (e) { self.dragstart(e); }, false);
	window.addEventListener('mousemove', function (e) { self.dragmove(e); }, false);
	window.addEventListener('mouseup', function (e) { self.dragend(e); }, false);

	window.addEventListener("touchstart", function (e) { self.dragstart(e); }, false);
	window.addEventListener("touchmove", function (e) { self.dragmove(e); }, false);
	window.addEventListener("touchend", function (e) { self.dragend(e); }, false);
}

Wheel.prototype.maxSteerAngle = 90;

Wheel.prototype.onSteer = function (callback) {
	this.onSteerFunc = callback;
};

Wheel.prototype.steer = function (angle) {
	this.canvas.style.transform = 'rotate(' + angle + 'deg)';
	this.currentAngle = angle;
	if (this.onSteerFunc)
		this.onSteerFunc({
			angle: angle < this.maxSteerAngle ? angle : -360 + angle
		});
};

Wheel.prototype.update = function () {
	this.canvas.style.marginLeft = -this.canvas.clientWidth / 2 + 'px';
	this.canvas.style.marginTop = -this.canvas.clientHeight / 2 + 'px';
	const rect = this.canvas.getBoundingClientRect();
	this.rotationPoint.x = rect.left + this.canvas.clientWidth / 2;
	this.rotationPoint.y = rect.top + this.canvas.clientHeight / 2;
};

Wheel.prototype.dragstart = function (e) {
	this.dragPoint.x = e.pageX;
	this.dragPoint.y = e.pageY;
	this.originToBegin = Vector.sub(this.dragPoint, this.rotationPoint);

	// Only accept clicking/tapping inside the radius of the wheel
	if (this.radius > 0 && this.originToBegin.mag() > this.radius)
		return;
	e.preventDefault();
	this.dragging = true;
};

Wheel.prototype.dragend = function (e) {
	if (!this.dragging)
		return;
	e.preventDefault();

	this.desiredAngle = 0;
	this.angle = this.currentAngle;

	const self = this;
	const interval = setInterval(function () {
		const angle = lerp(self.angle, self.angle < 180 ? 0 : 360, 0.2);
		if (self.dragging) {
			clearInterval(interval);
			return;
		}

		if (angle < 1 || angle > 360 - 1) {
			self.angle = 0;
			this.currentAngle = 0;
			self.steer(self.angle);
			clearInterval(interval);
			return;
		}

		self.angle = angle;
		self.steer(angle);
	}, 1000/60);

	this.dragging = false;

	if (DEBUG) {
		DEBUG_CTX.clearRect(0, 0, DEBUG_CANVAS.width, DEBUG_CANVAS.height);
	}
};

Wheel.prototype.dragmove = function (e) {
	if (!this.dragging)
		return;
	e.preventDefault();

	const current = new Vector(e.pageX, e.pageY);
	const originToCurrent = Vector.sub(current, this.rotationPoint);
	const angle = degrees(radiansPositive(Vector.angle(this.originToBegin, originToCurrent)));

	if (angle > this.maxSteerAngle && angle < 360 - this.maxSteerAngle)
		return;
	this.steer(angle);

	if (DEBUG) {
		DEBUG_CTX.clearRect(0, 0, DEBUG_CANVAS.width, DEBUG_CANVAS.height);
		DEBUG_CTX.beginPath();
		DEBUG_CTX.moveTo(this.rotationPoint.x, this.rotationPoint.y);
		DEBUG_CTX.lineTo(this.dragPoint.x, this.dragPoint.y);
		DEBUG_CTX.moveTo(this.rotationPoint.x, this.rotationPoint.y);
		DEBUG_CTX.lineTo(current.x, current.y);
		DEBUG_CTX.lineTo(this.dragPoint.x, this.dragPoint.y);
		DEBUG_CTX.stroke();
	}
};
