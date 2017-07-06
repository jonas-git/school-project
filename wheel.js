function degrees(radians) { return radians / Math.PI * 180; }
function radians(degrees) { return degrees * Math.PI / 180; }

degrees.abs = function (degrees) { return degrees > 0 ? degrees : 360 + degrees; };
radians.abs = function (radians) { return radians > 0 ? radians : 2 * Math.PI + radians; };

function lerp(value1, value2, amount) {
	amount = amount < 0 ? 0 : amount;
	amount = amount > 1 ? 1 : amount;
	return value1 + (value2 - value1) * amount;
}

/* > imageSource: Path or URL to an image of the wheel.
 * > axisX, axisY: The coordinates of the wheel's axis (center).
 * > options: An object that can contain the following optional properties:
 *     > container:
 *         A DIV element in which the wheel canvas should be put.
 *         If not supplied, a new element will be created.
 *     > onSteer: A function that is called when the wheel is steered.
 *     > fps: Number of frames that will be drawn per second.
 *     > lock: Locks the wheel when released. Smoothly reseted otherwise.
 */
function Wheel(imageSource, axisX, axisY, options) {
	const self = this;

	this.keys = []; // History of the keys that are pressed.
	this.originToBegin = null; // Vector from the rotation point to the drag start point.
	this.rotationPoint = new Vector(); // Point of rotation in the document.
	this.dragPoint = new Vector(); // Point where the user started dragging

	this.fps = options.fps || 60;
	this.lock = !!options.lock;
	this.onSteer = options.onSteer;

	this.device = Wheel.devices.none
	this.lastDevice = Wheel.devices.none;
	this.lastReport = 0;

	this.desiredAngle = this.restAngle;
	this.lastAngle = 0;
	this.angle = 0;

	this.container = options.container ? options.container : document.createElement('div');
	this.canvas = document.createElement('canvas');
	this.context = this.canvas.getContext('2d');
	// this.container.className = 'wheel';
	// this.canvas.className = 'wheel';

	// Ensure that the wheel axis is in the center
	// of the canvas, so that rotation is done properly.
	this.canvas.height = axisY * 2;
	this.canvas.width = axisX * 2;

	// Draw the wheel image to the canvas
	this.image = new Image();
	this.image.src = imageSource;
	this.image.onload = function () {
		self.canvas.getContext('2d').drawImage(this, 0, 0, this.width, this.height);
		self.imageCanvasRatio = this.height / self.canvas.height;
	};

	// Update the document.
	this.container.appendChild(this.canvas);
	if (!options.container)
		document.body.appendChild(this.container);

	// Once the document is loaded the state of the wheel can be updated,
	// because it needs the `clientWidth` attribute of the canvas element.
	document.addEventListener('DOMContentLoaded', function () { self.update(); });

	// Update the rotation point and the centering
	// of the canvas when the window is resized.
	window.addEventListener('resize', function () { self.update(); });

	// Set the event listeners for mouse, touch and keyboard events.
	window.addEventListener('mousedown', function (e) { self.dragstart(e); }, false);
	window.addEventListener('mousemove', function (e) { self.dragmove(e); }, false);
	window.addEventListener('mouseup', function (e) { self.dragend(e); }, false);
	window.addEventListener('touchstart', function (e) { self.dragstart(e); }, false);
	window.addEventListener('touchmove', function (e) { self.dragmove(e); }, false);
	window.addEventListener('touchend', function (e) { self.dragend(e); }, false);
	window.addEventListener('keydown', function (e) { self.keydown(e); }, false);
	window.addEventListener('keyup', function (e) { self.keyup(e); }, false);

	this.loop = setInterval(function () {
		self.update();
		if (self.device === Wheel.devices.keyboard || !self.lock && self.device !== Wheel.devices.mouse) {
			// Steer slower if the current or the last device used was the keyboard.
			const usesKeyboard = self.device === Wheel.devices.keyboard || self.lastDevice === Wheel.devices.keyboard;
			const angle = lerp(self.angle, self.desiredAngle, usesKeyboard ? self.lerpSpeedKeyboard : self.lerpSpeed);
			self.steer(angle, Math.abs(angle) > 0.5);
		}
	}, 1000 / this.fps);
}

Wheel.prototype.maxAngle = 90;
Wheel.prototype.restAngle = 0;
Wheel.prototype.lerpSpeed = 0.2;
Wheel.prototype.lerpSpeedKeyboard = 0.06;
Wheel.devices = {
	none: 0,
	mouse: 1,
	touchscreen: 2,
	keyboard: 3
};

Wheel.prototype.restAt = function (angle) {
	this.desiredAngle = angle;
	this.restAngle = angle;
};

Wheel.prototype.steer = function (angle, raiseEvent) {
	raiseEvent = arguments.length > 1 ? raiseEvent : true;
	if (raiseEvent && this.onSteer) {
		const flooredAngle = Math.floor(angle);
		if (flooredAngle != this.lastReport)
			this.report(flooredAngle);
	}
	else if (this.lastReport != 0)
		this.report(0);
	this.angle = angle;
	this.draw();
};

Wheel.prototype.report = function (angle) {
	if (this.onSteer)
		this.onSteer({ angle: this.lastReport = angle });
};

Wheel.prototype.draw = function () {
	const x = this.canvas.width / 2;
	const y = this.canvas.height / 2;
	this.context.translate(x, y);
	this.context.rotate(radians(this.angle));
	this.context.translate(-x, -y);
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	this.context.drawImage(this.image, 0, 0, this.image.width, this.image.height);
	this.context.setTransform(1, 0, 0, 1, 0, 0);
};

Wheel.prototype.update = function () {
	// this.canvas.style.marginLeft = -this.canvas.clientWidth / 2 + 'px';
	// this.canvas.style.marginTop = -this.canvas.clientHeight / 2 + 'px';
	const rect = this.canvas.getBoundingClientRect();
	this.rotationPoint.x = rect.left + this.canvas.clientWidth / 2;
	this.rotationPoint.y = rect.top + this.canvas.clientHeight / 2;
};

Wheel.prototype.dragstart = function (e) {
	this.dragPoint.x = e.pageX;
	this.dragPoint.y = e.pageY;
	this.originToBegin = Vector.sub(this.dragPoint, this.rotationPoint);

	// Only allow clicking/touching inside the radius of the wheel
	const radius = this.imageCanvasRatio * this.canvas.clientHeight / 2;
	if (this.originToBegin.mag() > radius)
		return;

	e.preventDefault();
	this.lastAngle = this.angle;
	this.device = Wheel.devices.mouse;
};

Wheel.prototype.dragmove = function (e) {
	if (this.device !== Wheel.devices.mouse)
		return;

	// Calculate the new angle of the wheel.
	const current = new Vector(e.pageX, e.pageY);
	const originToCurrent = Vector.sub(current, this.rotationPoint);
	var angle = degrees.abs(degrees(Vector.angle(this.originToBegin, originToCurrent)));
	angle = (this.lastAngle + angle) % 360;
	angle = angle < 180 ? angle : -360 + angle;

	// Steer if the angle does not exceed the maximum angle.
	if (Math.abs(angle) <= this.maxAngle)
		this.steer(angle);
};

Wheel.prototype.dragend = function (e) {
	this.lastDevice = this.device;
	this.device = Wheel.devices.none;
	this.desiredAngle = this.restAngle;
	this.lastAngle = 0;
};

Wheel.prototype.keydown = function (e) {
	// Prevent adding one key to the history multiple times.
	// (The onkeydown event is invoked multiple times when the key is held down)
	if (this.keys.length && this.keys[this.keys.length - 1].keyCode === e.keyCode)
		return;

	// Prepare the entry for the key history.
	const entry = { keyCode: e.keyCode };
	switch (e.keyCode) {
	case 37: entry.angle = -90; break; // Left arrow key.
	case 39: entry.angle = 90; break; // Right arrow key.
	default: return;
	}

	this.desiredAngle = entry.angle;
	this.keys.push(entry);
	this.device = Wheel.devices.keyboard;
};

Wheel.prototype.keyup = function (e) {
	// Return if the key was not the last pressed key and remove it from the history if necessary.
	if (this.keys.length && this.keys[this.keys.length - 1].keyCode !== e.keyCode) {
		this.keys.splice(this.keys.findIndex(function (entry) { return entry.keyCode === e.keyCode; }), 1);
		return;
	}

	this.keys.pop(); // Pop the key that was just released.
	// Set the desired angle to the angle that belongs to the key that was pressed before this key.
	this.desiredAngle = this.keys.length ? this.keys.pop().angle : this.restAngle;
	this.lastDevice = this.device;
	if (!this.keys.length)
		this.device = Wheel.devices.none;
};
