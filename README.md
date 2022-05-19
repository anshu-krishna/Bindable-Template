# Bindable Template
#### Version 2.0 (or Version 4 of One-way DOM Binder)
##### Note: This version is ***not*** compatible with the older versions.
___
This library provides a class called ```Bindable``` which facilitates creating template HTML with one-way DOM binding. It allows us to specify the binding sites using a *moustache* like syntax. e.g. -> '{{name}}'.

See the example file for more details.

## Installation:
Import from: [https://cdn.jsdelivr.net/gh/anshu-krishna/Bindable-Template@2.0/bindable.min.js](https://cdn.jsdelivr.net/gh/anshu-krishna/Bindable-Template@2.0/bindable.min.js)
```javascript
import { Bindable } from 'https://cdn.jsdelivr.net/gh/anshu-krishna/Bindable-Template@2.0/bindable.min.js';
```

## Example:

```html
<div id="d1">
	<b>Date:</b> {{date}}
	<br />
	<b>Readable Date:</b> {{ @readableDate(date) }}
	Name: {{name}}; Age: {{age}};
	<div data-info="NameUpperCase: {{name.toUpperCase()}}; Age: {{age}}; Msg: {{msg}}" data-name="{{name}}">
		Name UpperCase: <b>{{ name.toUpperCase() }}</b>; Age: <b>{{age}}</b>;
	</div>
	<div>
		Data: {{info}}
		<br />
		Global Function: {{
			/* Comments are allowed inside a expression. */
			#Math.random() // This returns random floats [0, 1];
		}}
		<br />
		Local Function: {{
			#parseInt(@mul(#Math.random(), 100)) // This returns random integers [0, 100]
		}}
		<br />
		Delayed Function: {{
			// Async functions are allowed;
			@delayedInt(1000)
		}}
	</div>
	{{msg}}
	<span data-name="{{ @join('-', name, age, 'test') }}"></span>
</div>
<script type="module">
	import { HTML } from 'https://cdn.jsdelivr.net/gh/anshu-krishna/HTML-Tagged-Template-Literals@3.0.1/html-ttl.min.js';
	import { Bindable } from './bindable.js';

	const manager = new Bindable(document.querySelector('#d1'));
	const { values, funcs } = manager;
	
	funcs.readableDate = function (val) {
		const d = Date.parse(val);
		if(isNaN(d)) { return 'Invalid date'; }
		return new Intl.DateTimeFormat('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(d);
	};
	funcs.delayedInt = async function (delay) {
		await new Promise(resolve => setTimeout(resolve, delay));
		return parseInt(Math.random() * 100);
	};

	values.name = 'Krishna';
	values.date = '2022-05-19';
	values.info = {a : 10, b : 20};
	values.age = 200;
	values.msg = HTML`<b>Replacing TextNode with a HTMLElement</b>`;

	// All keys
	console.log('All keys', Object.keys(values));
</script>
```