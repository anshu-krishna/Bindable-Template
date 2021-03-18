# Bindable Template
#### Version 1.0 (or Version 3 of One-way DOM Binder)
##### Note: This version is ***not*** compatible with the older versions.
___
This library provides a class called ```Bindable``` which facilitates creating template HTML with one-way DOM binding. It allows us to specify the binding sites using a *moustache* like syntax. e.g. -> '{{name}}'. Additionally sites can also be associated with a formatter for the specified  key. e.g. '{{name@upper}}'.

See the examples for more details.


## Properties

```Bindable``` has 2 properties.

1. ```values``` : Used to get and set bindable values.\
	eg:
	```html
	<div id="mydiv" class="{{css_class}}">{{msg}}</div>
	```
	```javascript
	let manager = new Bindable(document.querySelector('#mydiv'));
	let v = manager.values;
	v.msg = 'Hello world';
	v.css_class = 'bold red';
	```
	Result:
	```html
	<div id="mydiv" class="bold red">Hello world</div>
	```
2. ```keys``` : Used for getting a list of all the properties binded by the ```Bindable```.\
	eg:
	```html
	<div id="mydiv" class="{{css_class}}">{{msg}}</div>
	```
	```javascript
	let manager = new Bindable(document.querySelector('#mydiv'));
	let v = manager.values;
	v.msg = 'Hello world';
	v.css_class = 'bold red';
	
	console.log(manager.keys);
	// Logs: ["msg", "css_class"]
	```

## Methods

1. ```constructor(...elements)```

	Create a bindable. Optionally bind one or more elements to the binder.

2. ```bindElements(...elements)```

	Bind one or more elements to the binder.

3. ```unbindElements(...elements)```

	Unbind one or more elements from the binder.

4. ```nodes(key)``` : Provides references to all the nodes binded to a key.\
	eg:
	```html
	<div id="mydiv" class="{{css_class}}">
		<span>{{msg}}</span>
		<span>{{msg}}</span>
	</div>
	```
	```javascript
	let manager = new Bindable(document.querySelector('#mydiv'));
	let v = manager.values;
	v.msg = 'Hello world';
	v.css_class = 'bold red';
	
	console.log(manager.nodes('msg'));
	// Logs an array containing both the textNodes with the message

	console.log(manager.nodes('css_class'));
	//Logs an array containing the div's 'class' attribute node
	```
5. ```addFormatter(key, name)``` : Creates a formatter for a key.
	eg:
	```html
	<div id='mydiv'>
		Name: {{name}};
		<br />
		Name: {{name@upper}};
	</div>
	```
	```javascript
	let manager= new Bindable(document.querySelector('#mydiv'));
		let v = manager.values;
		manager.addFormatter('name', 'upper', v => (new String(v)).toUpperCase());
		
		v.name = 'Krishna';
	```
	Result:
	```html
	<div id='mydiv'>
		Name: Krisna;
		<br />
		Name: KRISHNA;
	</div>
	```


## Examples
1. Binding general data (text, numbers etc.)
	```html
	<div id="mydiv">
		Name: {{name}}; DOB: {{dob}};
		<div>
			Name: <b>{{name@upper}}</b>; DOB: <b>{{dob}}</b>;
		</div>
		<div data-info="Name: {{name}}; DOB: {{dob}};"></div>
		<span data-name="{{name}}" data-age="{{dob}}"></span>
	</div>
	```
	```javascript
	let manager = new Bindable(document.querySelector('#mydiv'));
	let v = manager.values;

	manager.addFormatter('name', 'upper', v => (new String(v)).toUpperCase());

	v.name = 'Krishna';
	v.dob = '1 Jan';
	```
	Result:
	```html
	<div id="mydiv">
		Name: Krishna; DOB: 1 Jan;
		<div>
			Name: <b>KRISHNA</b>; DOB: <b>1 Jan</b>;
		</div>
		<div data-info="Name: Krishna; DOB: 1 Jan;"></div>
		<span data-name="Krishna" data-age="1 Jan"></span>
	</div>
	```

2. Binding HTML elements
	```html
	<div id="mydiv">{{spacer}} {{content}} {{spacer}}</div>
	```
	```javascript
	let manager = new Bindable(document.querySelector('#mydiv'));
	let v = manager.values;
	
	let span = document.createElement('span');
	span.innerHTML = `Hello world`;
	v.content = span;

	v.spacer = document.createElement('hr');
	```
	Result:
	```html
	<div id="mydiv"><hr /> <span>Hello world</span> <hr /></div>
	```