/*
Author: Anshu Krishna
Contact: anshu.krishna5@gmail.com
Date: 19-Mar-2021
*/
const Bindable = (function() {
	class TargetStore {
		static __pattern = /({{([_a-zA-Z][_a-zA-Z0-9]*)(@([_a-zA-Z][_a-zA-Z0-9]*))?}})/;
		static __patternSize = 5;
		static __identifyParts = function(a) {
			const temp = {
				parts: [],
				end: null
			};
			const chunk = TargetStore.__patternSize;
			if(a.length % chunk !== 1) {
				console.error('Error in target pattern match');
				return [];
			}
			const end = a.pop();
			const ret = [];
			for(let i=0, j=a.length; i < j; i += chunk) {
				// Handle at relative [0] of the chunk
				if(a[i] != '') {
					ret.push(a[i]);
				}
				// Handle at relative [1] of the chunk
				// Handle at relative [2] & [4] of the chunk
				ret.push({
					prop: a[i + 2],
					format: a[i + 4] || null
				});
			}
			if(end != '') {
				ret.push(end);
			}
			return ret;
		};

		static __valueToString(value) {
			if(value === null) return '';
			switch(typeof value) {
				case 'string':
					return value;
				case 'object':
					if(value instanceof HTMLElement) {
						return value.textContent;
					}
					if(value instanceof Text) {
						return value.nodeValue;
					}
					return JSON.stringify(value);
				case 'function':
					return TargetStore.__valueToString(value());
				default:
					return String(value);
			}
		}
		
		store = [];
		manager = null;

		filter(selector) {
			if(selector.includes('@')) {
				return this.store.filter(v => v.dependsOn.formats.includes(selector));
			}
			return this.store.filter(v => v.dependsOn.props.includes(selector));
		}

		updateValue(sd /* sd = storeData*/) {
			if(typeof sd === 'number' && typeof this.store[sd] !== 'undefined') {
				sd = this.store[sd];
			}
			switch(sd.type) {
				case 'node':
					let replacement = this.manager.__getValue(sd.prop);
					if(replacement instanceof HTMLElement) {
						replacement = replacement.cloneNode(true);
					} else {
						replacement = document.createTextNode(TargetStore.__valueToString(replacement));
					}
					sd.node.parentNode.replaceChild(replacement, sd.node);
					sd.node = replacement;
					break;
				case 'attr':
					let parts = [];
					for(let p of sd.parts) {
						if(typeof p === 'object') {
							parts.push(TargetStore.__valueToString(this.manager.__getValue(p)));
						} else {
							parts.push(p);
						}
					}
					sd.node.nodeValue = parts.join('');
					break;
			}
		}
		findAndBind(element) {
			if(!(element instanceof HTMLElement)) {
				console.error('Only HTMLElement can be used for binding');
				return;
			}
			// Find pattern in child TextNodes
			for(let n of element.childNodes) {
				if(n.nodeType !== 3) continue;
				let parts = n.nodeValue.split(this.constructor.__pattern);
				if(parts.length < this.constructor.__patternSize) continue;
				parts = this.constructor.__identifyParts(parts);
				for(let i = 0, j = parts.length; i < j; i++) {
					if(typeof parts[i] === 'object') {
						let node = document.createTextNode(parts[i].prop);
						element.insertBefore(node, n);
						this.store.push({
							dependsOn: {
								props: [parts[i].prop],
								formats: [`${parts[i].prop}@${parts[i].format}`]
							},
							type: 'node',
							node: node,
							prop: parts[i]
						});
						this.updateValue(this.store.length - 1);
					} else {
						element.insertBefore(document.createTextNode(parts[i]), n);
					}
				}
				element.removeChild(n);
			}
			// Find pattern in child Arrtibutes
			for(let attr of element.attributes) {
				let parts = attr.value.split(this.constructor.__pattern);
				if(parts.length < this.constructor.__patternSize) continue;
				parts = this.constructor.__identifyParts(parts);
				let dependsOn = {
					props: new Set,
					formats: new Set
				}
				for(let p of parts) {
					if(typeof p === 'object') {
						dependsOn.props.add(p.prop);
						dependsOn.formats.add(`${p.prop}@${p.format}`);
					}
				}
				dependsOn.props = Array.from(dependsOn.props);
				dependsOn.formats = Array.from(dependsOn.formats);
				// attr.value = this.constructor.__attrPartsToValue(parts);
				this.store.push({
					dependsOn: dependsOn,
					type: 'attr',
					node: attr,
					parts: parts
				});
				this.updateValue(this.store.length - 1);
			}
			// Find pattern in child elements
			for(let c of element.children) {
				this.findAndBind(c);
			}
		}
		unbindElement(element, searchChildNodes = true, recursionTop = true) {
			if(!(element instanceof HTMLElement)) {
				console.error('Only HTMLElement can be used for unbinding');
				return;
			}
			let index = new Set;
			for(let i = 0, j = this.store.length; i < j; i++) {
				let t = this.store[i];
				if(searchChildNodes) {
					if(t.type === 'node' && element.contains(t.node)) {
						index.add(i);
					}
				}
				if(t.type === 'attr') {
					const attrs = Array.from(element.attributes);
					if(attrs.includes(t.node)) {
						index.add(i);
					}
				}
			}
			for(let c of element.children) {
				index = new Set([...index, ...this.unbindElement(c, false, false)]);
			}
			if(recursionTop) {
				this.store = this.store.filter((v, i) => !index.has(i));
			} else {
				return index;
			}
		}
	}
	class Bindable {
		constructor(...elements) {
			this.__ts.manager = this;
			Object.defineProperties(this, {
				__valuesProxy : {
					value : new Proxy(this.__values, {
						get: (obj, prop) => {
							if(typeof obj[prop] === 'undefined') {
								return prop;
							}
							return obj[prop];
						},
						set: (obj, prop, value) => {
							this.__values[prop] = value;
							this.__updateFormatted(prop);
							this.__updateValue(prop);
						},
						deleteProperty: (obj, prop) => {
							delete this.__values[prop];
							this.__updateFormatted(prop);
							this.__updateValue(prop);
						}
					})
				}
			});
			this.bindElements(...elements);
		}
		bindElements(...elements) {
			for(let e of elements) {
				this.__ts.findAndBind(e);
			}
		}
		unbindElements(...elements) {
			for(let e of elements) {
				this.__ts.unbindElement(e);
			}
		}
		get values() {
			return this.__valuesProxy;
		}
		get keys() {
			return Reflect.ownKeys(this.__values);
		}
		nodes(prop) {
			let l = this.__ts.filter(prop);
			return l.map(v => v.node);
		}
		__updateFormatted(prop) {
			if(typeof this.__formatters[prop] !== 'object') {
				return;
			}
			for(let f of Reflect.ownKeys(this.__formatters[prop])) {
				this.__formatters[prop][f].value = this.__formatters[prop][f].handler(this.values[prop]);
			}
		}
		__updateValue(prop) {
			let list = this.__ts.filter(prop);
			for(let l of list) {
				this.__ts.updateValue(l);
			}
		}
		__getValue({prop, format=null}) {
			if(format === null) {
				return this.values[prop];
			}
			if(
				(typeof this.__formatters[prop] === 'object')
				&& (typeof this.__formatters[prop][format] === 'object')
			) {
				return this.__formatters[prop][format].value;
			}
			return this.values[prop];
		}
		addFormatter(prop, name, handler) {
			if(
				(typeof prop !== 'string')
				&& (typeof name !== 'string')
				&& (typeof handler !== 'function')
			) {
				console.error('TypeError: Required -> prop[string]; name[string]; handler[function];');
				return;
			}
			if(typeof this.__formatters[prop] !== 'object') {
				this.__formatters[prop] = {};
			}
			this.__formatters[prop][name] = {
				handler : handler,
				value: handler(this.values[prop])
			}
			this.__updateValue(`${prop}@${name}`);
		}
		removeFormatter(prop, name) {
			if(
				(typeof prop !== 'string')
				&& (typeof name !== 'string')
			) {
				console.error('TypeError: Required -> prop[string]; name[string];');
				return;
			}
			if(typeof this.__formatters[prop] !== 'object') {
				return;
			}
			delete this.__formatters[prop][name];
			this.__updateValue(`${prop}@${name}`);
		}
	}
	Object.defineProperties(Bindable.prototype, {
		__values: {
			value: {}
		},
		__ts: {
			value : new TargetStore
		},
		__formatters: {
			value: {}
		}
	});

	return Bindable;
})();