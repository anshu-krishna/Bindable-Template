import { Expression } from './expression.js';
import { Peg } from './peg-parser.js';

class NodeType { // Enum for Node Types
	static Text = 0;
	static HTMLElement = 1;
	static DocumentFragment = 2;
	static Attr = 3;
	static get(value) {
		if (value instanceof Text) {
			return NodeType.Text;
		} else if (value instanceof HTMLElement) {
			return NodeType.HTMLElement;
		} else if (value instanceof DocumentFragment) {
			return NodeType.DocumentFragment;
		} else if (value instanceof Attr) {
			return NodeType.Attr;
		} else {
			return null;
		}
	}
}
class SiteType { // Enum for Site Type
	static Element = 0;
	static AttrReplace = 1;
	static AttrValue = 2;
}
class Convert {
	static stringify(value) {
		if (NodeType.get(value) !== null) { return value.textContent; }
		switch (typeof value) {
			case 'string': return value;
			case 'object': if (Array.isArray(value)) { // Convert array
				return JSON.stringify(value.map(v => Convert.stringify(v)));
			} else if (value !== null) { // Convert normal object
				return JSON.stringify(Object.fromEntries(Object.entries(value).map((k, v) => [k, Convert.stringify(v)])));
			} break;
			case 'undefined': return 'undefined';
		}
		return JSON.stringify(value);
	}

	static nodify(value) {
		const nodeType = NodeType.get(value);
		if (nodeType !== null) { return nodeType === NodeType.Attr ? document.createTextNode(value.textContent) : value; }
		switch (typeof value) {
			case 'string': return document.createTextNode(value);
			case 'object': if (Array.isArray(value)) {
				const frag = document.createDocumentFragment();
				for (let i of value) {
					frag.appendChild(Convert.nodify(i));
				}
				return frag;
			} break;
			case 'undefined': return document.createTextNode('undefined');
		}
		return document.createTextNode(JSON.stringify(value));
	}
}

class Parser {
	static #patterns = {
		start: /{{/g,
		end: /}}/g
	}
	static parse(ip, attrMode = false) {
		const items = String(ip).split(Parser.#patterns.start);
		let ret = [items.shift()];
		let last = 0;
		for (let i of items) {
			if (ret[last].at(-1) === '\\') {
				ret[last] = `${ret[last]}${i}\\{{`;
			} else {
				const iparts = i.split(Parser.#patterns.end);
				const exp = iparts.shift();
				try {
					const parsed = Peg.parse(exp);
					ret.push(parsed);
					ret.push('');
					last += 2;
				} catch (error) {
					console.error('Invalid expression:', exp, 'Error:', error.message);
					ret[last] = `${ret[last]}${exp}}}`;
				}
				ret[last] = `${ret[last]}${iparts.join('}}')}`;
			}
		}
		if (ret.length < 2) {
			return null;
		}
		ret = ret.filter(v => v !== '');
		if (attrMode) {
			if (ret.length === 1) {
				return ret[0] instanceof Expression ? ret[0] : null;
			}
			return new Expression([{ "sc": "@", "nm": "__array_pass_thru__", "arg": ret }]);
		}
		return ret;
	}
}
class Bindable {
	static #elementReplacer(parent, s, value) {
		if (s.frag !== false) {
			for (let n of s.frag) { parent.removeChild(n); }
			s.frag = false;
		}
		switch (NodeType.get(value)) {
			case NodeType.HTMLElement:
			case NodeType.Text: {
				parent.replaceChild(value, s.site);
				s.site = value;
			} break;
			case NodeType.DocumentFragment: {
				const nodes = [...value.childNodes];
				const first = nodes.shift();
				s.frag = nodes.length ? nodes : false;
				parent.replaceChild(value, s.site);
				s.site = first;
			} break;
			case NodeType.Attr: {
				value = document.createTextNode(value.textContent);
				parent.replaceChild(value, s.site);
				s.site = value;
			} break;
			case null: {
				Bindable.#elementReplacer(parent, s, Convert.nodify(value));
			} break;
		}
	}
	static #containsAttr(elem, attr) {
		if((new Set(elem.attributes)).has(attr)) { return true; }
		for(let c of elem.childElements) {
			if(Bindable.#containsAttr(c, attr)) { return true; }
		}
		return false;
	}
	static #contains(container, item) {
		switch(NodeType.get(container)) {
			case NodeType.HTMLElement:
			case NodeType.DocumentFragment: {
				if(item.ty === SiteType.Element) {
					return container.contains(item.site);
				} else {
					return Bindable.#containsAttr(container, item.site);
				}
			} break;
			case NodeType.Text: {
				if(item.ty === SiteType.Element) {
					return container.contains(item.site);
				} else { return false; }
			} break;
			case NodeType.Attr: {
				if(item.ty === SiteType.Element) {
					return false;
				} else {
					return container.isSameNode(item.site);
				}
			} break;
		}
		return false;
	}
	#debug = false;
	get debugMode() { return this.#debug; }
	set debugMode(val) { this.#debug = !!val; }

	#store = {
		vals: {},
		fns: {
			__array_pass_thru__(...items) { return items; },
			join(sep, ...items) { return items.join(sep) },
			add(...items) {
				switch (items.length) {
					case 0: return undefined;
					case 1: return items[0];
				}
				let sum = items.shift();
				for (let i of items) {
					sum = sum + i;
				}
				return sum;
			},
			mul(...items) {
				switch (items.length) {
					case 0: return undefined;
					case 1: return items[0];
				}
				let mul = items.shift();
				for (let i of items) {
					mul = mul * i;
				}
				return mul;
			},
			sub(first, second) { return first - second; },
			div(first, second) { return first / second; },
			mod(first, second) { return first % second; },
			pow(first, second) { return first ** second; },
			cond(condition, then, otherwise) { return condition ? then : otherwise; }
		}
	};
	#store_proxy = {};
	get values() { return this.#store_proxy.vals; }
	get funcs() { return this.#store_proxy.fns; }

	#sites = new Set;

	constructor(node, ...nodes) {
		this.#store_proxy.vals = new Proxy(this.#store.vals, {
			get: (vals, key) => vals[key] ?? undefined,
			set: (vals, key, val) => {
				vals[key] = val;
				this.triggerUpdate({ values: [key] });
				return true;
			}
		});
		this.#store_proxy.fns = new Proxy(this.#store.fns, {
			get: (fns, key) => fns[key] ?? undefined,
			set: (fns, key, fn) => {
				if (typeof fn === 'function') {
					fns[key] = fn;
					this.triggerUpdate({ funcs: [key] });
					return true;
				}
				return false;
			}
		});
		if (NodeType.get(node) === null) {
			this.#debug = !!node;
		} else {
			this.bind(node);
		}
		this.bind(...nodes);
	}
	#filterDependentSites(values = [], funcs = []) {
		const sites = new Set;
		for (let s of this.#sites) {
			for (let v of values) {
				if (s.on.val.has(v)) {
					sites.add(s);
					break;
				}
			}
			for (let f of funcs) {
				if (s.on.fn.has(f)) {
					sites.add(s);
					break;
				}
			}
		}
		return sites;
	}
	#binder(node) {
		switch (NodeType.get(node)) {
			case NodeType.HTMLElement:
			case NodeType.DocumentFragment: {
				for (let a of node.attributes ?? []) { this.#bindAttrSite(a); }
				for (let c of node.childNodes) {
					switch (c.nodeType) {
						case 3: // TextNode
							this.#bindElementSite(c);
							break;
						case 1: // Elements
							this.#binder(c);
							break;
					}
				}
			} break;
			case NodeType.Text: this.#bindElementSite(node); break;
			case NodeType.Attr: this.#bindAttrSite(node); break;
			default: console.error('TypeError: Cannot bind', node); break;
		}
	}
	#bindElementSite(node) {
		const parts = Parser.parse(node.nodeValue);
		if (parts === null) { return; }
		const newSites = new Set;
		const frag = new DocumentFragment;
		for (const p of parts) {
			if (p instanceof Expression) {
				const txt = document.createTextNode('');
				const site = {
					ty: SiteType.Element,
					fmt: p,
					on: p.on,
					site: txt,
					frag: false
				};
				this.#sites.add(site);
				frag.appendChild(txt);
				newSites.add(site);
			} else {
				frag.appendChild(document.createTextNode(p));
			}
		}
		node.parentNode.replaceChild(frag, node);
		for(let s of newSites) { this.#updateSite(s); }
	}
	#bindAttrSite(node) {
		const name = Parser.parse(node.nodeName, true);
		const value = Parser.parse(node.nodeValue, true);
		if (name !== null) {
			const site = {
				ty: SiteType.AttrReplace,
				fmt: { name: name, value: value ?? node.nodeValue },
				on: {
					fn: new Set([...name.on.fn, ...(value?.on.fn ?? [])]),
					val: new Set([...name.on.val, ...(value?.on.val ?? [])])
				},
				site: node
			};
			this.#sites.add(site);
			this.#updateSite(site);
			return;
		}
		if (value !== null) {
			const site = {
				ty: SiteType.AttrValue,
				fmt: value,
				on: value.on,
				site: node
			};
			this.#sites.add(site);
			this.#updateSite(site);
		}
	}
	async #updateSite(s) {
		switch (s.ty) {
			case SiteType.Element: {
				const parent = s.site.parentNode;
				const value = await s.fmt.evaluate(this.#store, this.#debug);
				Bindable.#elementReplacer(parent, s, value);
			} break;
			case SiteType.AttrReplace: {
				const name = Convert.stringify(await s.fmt.name.evaluate(this.#store, this.#debug)).replaceAll(/[^\w]+/gi, '-').replace(/^[-]+/, '');
				const value = Convert.stringify((s.fmt.value instanceof Expression) ? (await s.fmt.value.evaluate(this.#store, this.#debug)) : s.fmt.value);
				const parent = s.site.ownerElement;
				if (parent === null) {
					s.site = document.createAttribute(name);
					s.site.nodeValue = value;
				} else {
					parent.removeAttributeNode(s.site);
					parent.setAttribute(name, value);
					s.site = parent.getAttributeNode(name);
				}
			} break;
			case SiteType.AttrValue: {
				s.site.nodeValue = Convert.stringify(await s.fmt.evaluate(this.#store, this.#debug));
			} break;
		}
	}
	bind(...nodes) {
		for (let n of nodes) { this.#binder(n); };
	}
	unbind(...nodes) {
		nodes = nodes.filter(n => NodeType.get(n) !== null);
		const which = new Set;
		for(let s of this.#sites) {
			for(let n of nodes) {
				if(Bindable.#contains(n, s)) { which.add(s); }
			}
		}
		for(let s of which) { this.#sites.delete(s); }
	}
	triggerUpdate({ values = [], funcs = [] } = {}) {
		const all = [];
		for(let s of this.#filterDependentSites(values, funcs)) {
			all.push(this.#updateSite(s));
		}
		return Promise.allSettled(all);
	}
}

export { Bindable };