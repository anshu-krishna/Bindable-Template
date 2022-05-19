export class Expression {
	#fmt;
	on = {
		fn: new Set,
		val: new Set
	}

	constructor(exp) {
		const first = exp[0];
		switch (first.sc) {
			case '~': first.sc = '@';
			case '@':
				// Add first dependency
				if (typeof first.arg === 'undefined') {
					this.on.val.add(first.nm);
				} else {
					this.on.fn.add(first.nm);
				}
				break;
		}
		this.#fmt = exp;
		// Add sub dependency
		for (let s of this.#fmt) {
			if (typeof s.arg !== 'undefined') {
				for (let item of s.arg) {
					if (item instanceof Expression) {
						this.on.fn = new Set([...this.on.fn, ...item.on.fn]);
						this.on.val = new Set([...this.on.val, ...item.on.val]);
					}
				}
			}
		}
	}
	async evaluate(store, debug = false) {
		if (debug) {
			console.groupCollapsed('Expression evaluation:'); // Start Group 1
			console.log('Expression:', this);
		}
		let val;
		try {
			for (let i of this.#fmt) {
				const isFn = typeof i.arg !== 'undefined';
				let source;
				switch (i.sc) {
					case '~': source = val; break;
					case '@': source = isFn ? store.fns : store.vals; break;
					case "#": source = window; break;
				}
				if (isFn) {
					if (typeof source[i.nm] !== 'function') {
						val = undefined;
						if (debug) {
							console.group('Step:'); // Start Group 2
							console.log('Prop:', `${i.nm} is not a function`, '; Value:', val);
							console.groupEnd(); // End Group 2
						}
						break;
					}
					const arg = i.arg;
					for (let a = 0, l = arg.length; a < l; a++) {
						if (arg[a] instanceof Expression) {
							arg[a] = await arg[a].evaluate(store, debug);
						}
					}
					if (debug) { console.group('Step:'); } // Start Group 3
					try {
						val = (source[i.nm])(...arg);
						if (debug) {
							console.log('Prop:', `${i.nm}(${JSON.stringify(arg).slice(1, -1)})`, '; Value:', val);
						}
					} catch (error) {
						val = undefined;
						if (debug) {
							console.log('Prop:', `${i.nm}(${JSON.stringify(arg).slice(1, -1)})`, '; Value:', val, '; Execution error =', error);
						}
					}
					if (debug) { console.groupEnd(); } // End Group 3
				} else {
					val = source[i.nm];
					if (debug) {
						console.group('Step:'); // Start Group 4
						console.log('Prop:', i.nm, '; Value:', val);
						console.groupEnd(); // End Group 4
					}
				}
				if (val instanceof Promise) {
					if (debug) {
						console.group('Step:'); // Start Group 5
						console.log('Resolving Promise');
					}
					val = await val;
					if (debug) {
						console.log('Value:', val);
						console.groupEnd(); // End Group 5
					}
				}
			}

		} catch (error) {
			val = undefined;
			if (debug) {
				console.error('Evaluation Error:', error);
			}
		}
		if (debug) {
			console.log('Final value:', val);
			console.groupEnd(); // End Group 1
		}
		return val;
	}
}