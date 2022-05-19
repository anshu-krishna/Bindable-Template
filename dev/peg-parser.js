import { Expression } from './expression.js';

export const Peg = (function () {
	"use strict";

	function peg_subclass(child, parent) {
		function ctor() { this.constructor = child; }
		ctor.prototype = parent.prototype;
		child.prototype = new ctor();
	}

	function peg_SyntaxError(message, expected, found, location) {
		this.message = message;
		this.expected = expected;
		this.found = found;
		this.location = location;
		this.name = "SyntaxError";

		if (typeof Error.captureStackTrace === "function") {
			Error.captureStackTrace(this, peg_SyntaxError);
		}
	}

	peg_subclass(peg_SyntaxError, Error);

	peg_SyntaxError.buildMessage = function (expected, found) {
		let DESCRIBE_EXPECTATION_FNS = {
			literal: function (expectation) {
				return "\"" + literalEscape(expectation.text) + "\"";
			},

			"class": function (expectation) {
				let escapedParts = "",
					i;

				for (i = 0; i < expectation.parts.length; i++) {
					escapedParts += expectation.parts[i] instanceof Array
						? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
						: classEscape(expectation.parts[i]);
				}

				return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
			},

			any: function (expectation) {
				return "any character";
			},

			end: function (expectation) {
				return "end of input";
			},

			other: function (expectation) {
				return expectation.description;
			}
		};

		function hex(ch) {
			return ch.charCodeAt(0).toString(16).toUpperCase();
		}

		function literalEscape(s) {
			return s
				.replace(/\\/g, '\\\\')
				.replace(/"/g, '\\"')
				.replace(/\0/g, '\\0')
				.replace(/\t/g, '\\t')
				.replace(/\n/g, '\\n')
				.replace(/\r/g, '\\r')
				.replace(/[\x00-\x0F]/g, function (ch) { return '\\x0' + hex(ch); })
				.replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) { return '\\x' + hex(ch); });
		}

		function classEscape(s) {
			return s
				.replace(/\\/g, '\\\\')
				.replace(/\]/g, '\\]')
				.replace(/\^/g, '\\^')
				.replace(/-/g, '\\-')
				.replace(/\0/g, '\\0')
				.replace(/\t/g, '\\t')
				.replace(/\n/g, '\\n')
				.replace(/\r/g, '\\r')
				.replace(/[\x00-\x0F]/g, function (ch) { return '\\x0' + hex(ch); })
				.replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) { return '\\x' + hex(ch); });
		}

		function describeExpectation(expectation) {
			return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
		}

		function describeExpected(expected) {
			let descriptions = new Array(expected.length),
				i, j;

			for (i = 0; i < expected.length; i++) {
				descriptions[i] = describeExpectation(expected[i]);
			}

			descriptions.sort();

			if (descriptions.length > 0) {
				for (i = 1, j = 1; i < descriptions.length; i++) {
					if (descriptions[i - 1] !== descriptions[i]) {
						descriptions[j] = descriptions[i];
						j++;
					}
				}
				descriptions.length = j;
			}

			switch (descriptions.length) {
				case 1:
					return descriptions[0];

				case 2:
					return descriptions[0] + " or " + descriptions[1];

				default:
					return descriptions.slice(0, -1).join(", ")
						+ ", or "
						+ descriptions[descriptions.length - 1];
			}
		}

		function describeFound(found) {
			return found ? "\"" + literalEscape(found) + "\"" : "end of input";
		}

		return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
	};

	function peg_parse(input, options) {
		options = options !== void 0 ? options : {};

		let peg_FAILED = {},

			peg_startRuleFunctions = { Exp: peg_parseExp },
			peg_startRuleFunction = peg_parseExp,

			peg_c0 = function (head, tail) { return new Expression(mkArray(head, tail)); },
			peg_c1 = "#",
			peg_c2 = peg_literalExpectation("#", false),
			peg_c3 = "@",
			peg_c4 = peg_literalExpectation("@", false),
			peg_c5 = function (sc, nm, arg) { return { nm: nm, arg: arg ?? [] }; },
			peg_c6 = function (sc, nm) { return { nm: nm }; },
			peg_c7 = function (sc, i) { return { sc: sc ?? "~", ...i }; },
			peg_c8 = function (v) { return v; },
			peg_c9 = "/",
			peg_c10 = peg_literalExpectation("/", false),
			peg_c11 = /^[^\0-\x1F\\\/]/,
			peg_c12 = peg_classExpectation([["\0", "\x1F"], "\\", "/"], true, false),
			peg_c13 = /^[iumg]/,
			peg_c14 = peg_classExpectation(["i", "u", "m", "g"], false, false),
			peg_c15 = function (chars, fg) { return new RegExp(chars.join(""), fg); },
			peg_c16 = peg_otherExpectation("object"),
			peg_c17 = function (head, tail) { return Object.fromEntries(mkArray(head, tail)); },
			peg_c18 = function (members) { return members !== null ? members : {}; },
			peg_c19 = peg_otherExpectation("key:val pair"),
			peg_c20 = function (name, value) { return [name, value]; },
			peg_c21 = peg_otherExpectation("key"),
			peg_c22 = function (values) { return values ?? []; },
			peg_c23 = function (head, tail) { return mkArray(head, tail); },
			peg_c24 = peg_otherExpectation("null"),
			peg_c25 = "null",
			peg_c26 = peg_literalExpectation("null", false),
			peg_c27 = function () { return null; },
			peg_c28 = peg_otherExpectation("undefined"),
			peg_c29 = "undefined",
			peg_c30 = peg_literalExpectation("undefined", false),
			peg_c31 = function () { return undefined; },
			peg_c32 = "false",
			peg_c33 = peg_literalExpectation("false", false),
			peg_c34 = function () { return false; },
			peg_c35 = "true",
			peg_c36 = peg_literalExpectation("true", false),
			peg_c37 = function () { return true; },
			peg_c38 = peg_otherExpectation("number"),
			peg_c39 = "-",
			peg_c40 = peg_literalExpectation("-", false),
			peg_c41 = "0x",
			peg_c42 = peg_literalExpectation("0x", false),
			peg_c43 = function (neg, digits) { return parseInt(`${neg ?? ''}${digits}`, 16); },
			peg_c44 = "0o",
			peg_c45 = peg_literalExpectation("0o", false),
			peg_c46 = /^[0-7]/,
			peg_c47 = peg_classExpectation([["0", "7"]], false, false),
			peg_c48 = function (neg, digits) { return parseInt(`${neg ?? ''}${digits}`, 8); },
			peg_c49 = "0b",
			peg_c50 = peg_literalExpectation("0b", false),
			peg_c51 = /^[0-1]/,
			peg_c52 = peg_classExpectation([["0", "1"]], false, false),
			peg_c53 = function (neg, digits) { return parseInt(`${neg ?? ''}${digits}`, 2); },
			peg_c54 = ".",
			peg_c55 = peg_literalExpectation(".", false),
			peg_c56 = /^[eE]/,
			peg_c57 = peg_classExpectation(["e", "E"], false, false),
			peg_c58 = "+",
			peg_c59 = peg_literalExpectation("+", false),
			peg_c60 = function () { return parseFloat(text()); },
			peg_c61 = peg_otherExpectation("string"),
			peg_c62 = "\"",
			peg_c63 = peg_literalExpectation("\"", false),
			peg_c64 = /^[^\0-\x1F\\"]/,
			peg_c65 = peg_classExpectation([["\0", "\x1F"], "\\", "\""], true, false),
			peg_c66 = function (chars) { return chars.join(""); },
			peg_c67 = "'",
			peg_c68 = peg_literalExpectation("'", false),
			peg_c69 = /^[^\0-\x1F\\']/,
			peg_c70 = peg_classExpectation([["\0", "\x1F"], "\\", "'"], true, false),
			peg_c71 = "`",
			peg_c72 = peg_literalExpectation("`", false),
			peg_c73 = /^[^\0-\x1F\\`]/,
			peg_c74 = peg_classExpectation([["\0", "\x1F"], "\\", "`"], true, false),
			peg_c75 = "\\\\",
			peg_c76 = peg_literalExpectation("\\\\", false),
			peg_c77 = function () { return '\\'; },
			peg_c78 = "\\\"",
			peg_c79 = peg_literalExpectation("\\\"", false),
			peg_c80 = function () { return '"'; },
			peg_c81 = "\\'",
			peg_c82 = peg_literalExpectation("\\'", false),
			peg_c83 = function () { return "'"; },
			peg_c84 = "\\`",
			peg_c85 = peg_literalExpectation("\\`", false),
			peg_c86 = function () { return '`'; },
			peg_c87 = "\\b",
			peg_c88 = peg_literalExpectation("\\b", false),
			peg_c89 = function () { return '\b'; },
			peg_c90 = "\\f",
			peg_c91 = peg_literalExpectation("\\f", false),
			peg_c92 = function () { return '\f'; },
			peg_c93 = "\\n",
			peg_c94 = peg_literalExpectation("\\n", false),
			peg_c95 = function () { return '\n'; },
			peg_c96 = "\\r",
			peg_c97 = peg_literalExpectation("\\r", false),
			peg_c98 = function () { return '\r'; },
			peg_c99 = "\\t",
			peg_c100 = peg_literalExpectation("\\t", false),
			peg_c101 = function () { return '\t'; },
			peg_c102 = "\\0",
			peg_c103 = peg_literalExpectation("\\0", false),
			peg_c104 = function (digits) { return String.fromCharCode(parseInt(digits, 8)); },
			peg_c105 = "\\x",
			peg_c106 = peg_literalExpectation("\\x", false),
			peg_c107 = function (digits) { return String.fromCharCode(parseInt(digits, 16)); },
			peg_c108 = "\\u",
			peg_c109 = peg_literalExpectation("\\u", false),
			peg_c110 = /^[\n]/,
			peg_c111 = peg_classExpectation(["\n"], false, false),
			peg_c112 = /^[\t]/,
			peg_c113 = peg_classExpectation(["\t"], false, false),
			peg_c114 = peg_otherExpectation("whitespace"),
			peg_c115 = /^[ \t\n\r]/,
			peg_c116 = peg_classExpectation([" ", "\t", "\n", "\r"], false, false),
			peg_c117 = peg_otherExpectation("Comment"),
			peg_c118 = "/*",
			peg_c119 = peg_literalExpectation("/*", false),
			peg_c120 = /^[^*]/,
			peg_c121 = peg_classExpectation(["*"], true, false),
			peg_c122 = "*",
			peg_c123 = peg_literalExpectation("*", false),
			peg_c124 = /^[\/]/,
			peg_c125 = peg_classExpectation(["/"], false, false),
			peg_c126 = "*/",
			peg_c127 = peg_literalExpectation("*/", false),
			peg_c128 = "//",
			peg_c129 = peg_literalExpectation("//", false),
			peg_c130 = /^[^\n]/,
			peg_c131 = peg_classExpectation(["\n"], true, false),
			peg_c132 = peg_otherExpectation("hex-char"),
			peg_c133 = /^[0-9a-f]/i,
			peg_c134 = peg_classExpectation([["0", "9"], ["a", "f"]], false, true),
			peg_c135 = peg_otherExpectation("digit"),
			peg_c136 = /^[0-9]/,
			peg_c137 = peg_classExpectation([["0", "9"]], false, false),
			peg_c138 = peg_otherExpectation("identifier"),
			peg_c139 = /^[_a-z$]/i,
			peg_c140 = peg_classExpectation(["_", ["a", "z"], "$"], false, true),
			peg_c141 = /^[0-9a-z$_]/i,
			peg_c142 = peg_classExpectation([["0", "9"], ["a", "z"], "$", "_"], false, true),
			peg_c143 = ",",
			peg_c144 = peg_literalExpectation(",", false),
			peg_c145 = ":",
			peg_c146 = peg_literalExpectation(":", false),
			peg_c147 = "[",
			peg_c148 = peg_literalExpectation("[", false),
			peg_c149 = "]",
			peg_c150 = peg_literalExpectation("]", false),
			peg_c151 = "{",
			peg_c152 = peg_literalExpectation("{", false),
			peg_c153 = "}",
			peg_c154 = peg_literalExpectation("}", false),
			peg_c155 = "(",
			peg_c156 = peg_literalExpectation("(", false),
			peg_c157 = ")",
			peg_c158 = peg_literalExpectation(")", false),

			peg_currPos = 0,
			peg_savedPos = 0,
			peg_posDetailsCache = [{ line: 1, column: 1 }],
			peg_maxFailPos = 0,
			peg_maxFailExpected = [],
			peg_silentFails = 0,

			peg_result;

		if ("startRule" in options) {
			if (!(options.startRule in peg_startRuleFunctions)) {
				throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
			}

			peg_startRuleFunction = peg_startRuleFunctions[options.startRule];
		}

		function text() {
			return input.substring(peg_savedPos, peg_currPos);
		}

		function location() {
			return peg_computeLocation(peg_savedPos, peg_currPos);
		}

		function expected(description, location) {
			location = location !== void 0 ? location : peg_computeLocation(peg_savedPos, peg_currPos)

			throw peg_buildStructuredError(
				[peg_otherExpectation(description)],
				input.substring(peg_savedPos, peg_currPos),
				location
			);
		}

		function error(message, location) {
			location = location !== void 0 ? location : peg_computeLocation(peg_savedPos, peg_currPos)

			throw peg_buildSimpleError(message, location);
		}

		function peg_literalExpectation(text, ignoreCase) {
			return { type: "literal", text: text, ignoreCase: ignoreCase };
		}

		function peg_classExpectation(parts, inverted, ignoreCase) {
			return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
		}

		function peg_anyExpectation() {
			return { type: "any" };
		}

		function peg_endExpectation() {
			return { type: "end" };
		}

		function peg_otherExpectation(description) {
			return { type: "other", description: description };
		}

		function peg_computePosDetails(pos) {
			let details = peg_posDetailsCache[pos], p;

			if (details) {
				return details;
			} else {
				p = pos - 1;
				while (!peg_posDetailsCache[p]) {
					p--;
				}

				details = peg_posDetailsCache[p];
				details = {
					line: details.line,
					column: details.column
				};

				while (p < pos) {
					if (input.charCodeAt(p) === 10) {
						details.line++;
						details.column = 1;
					} else {
						details.column++;
					}

					p++;
				}

				peg_posDetailsCache[pos] = details;
				return details;
			}
		}

		function peg_computeLocation(startPos, endPos) {
			let startPosDetails = peg_computePosDetails(startPos),
				endPosDetails = peg_computePosDetails(endPos);

			return {
				start: {
					offset: startPos,
					line: startPosDetails.line,
					column: startPosDetails.column
				},
				end: {
					offset: endPos,
					line: endPosDetails.line,
					column: endPosDetails.column
				}
			};
		}

		function peg_fail(expected) {
			if (peg_currPos < peg_maxFailPos) { return; }

			if (peg_currPos > peg_maxFailPos) {
				peg_maxFailPos = peg_currPos;
				peg_maxFailExpected = [];
			}

			peg_maxFailExpected.push(expected);
		}

		function peg_buildSimpleError(message, location) {
			return new peg_SyntaxError(message, null, null, location);
		}

		function peg_buildStructuredError(expected, found, location) {
			return new peg_SyntaxError(
				peg_SyntaxError.buildMessage(expected, found),
				expected,
				found,
				location
			);
		}

		function peg_parseExp() {
			let s0, s1, s2, s3, s4, s5, s6;

			s0 = peg_currPos;
			s1 = peg_parse_();
			if (s1 !== peg_FAILED) {
				s2 = peg_parseExpItem();
				if (s2 !== peg_FAILED) {
					s3 = [];
					s4 = peg_currPos;
					s5 = peg_parseDOT();
					if (s5 !== peg_FAILED) {
						s6 = peg_parseExpItem();
						if (s6 !== peg_FAILED) {
							s5 = [s5, s6];
							s4 = s5;
						} else {
							peg_currPos = s4;
							s4 = peg_FAILED;
						}
					} else {
						peg_currPos = s4;
						s4 = peg_FAILED;
					}
					while (s4 !== peg_FAILED) {
						s3.push(s4);
						s4 = peg_currPos;
						s5 = peg_parseDOT();
						if (s5 !== peg_FAILED) {
							s6 = peg_parseExpItem();
							if (s6 !== peg_FAILED) {
								s5 = [s5, s6];
								s4 = s5;
							} else {
								peg_currPos = s4;
								s4 = peg_FAILED;
							}
						} else {
							peg_currPos = s4;
							s4 = peg_FAILED;
						}
					}
					if (s3 !== peg_FAILED) {
						s4 = peg_parse_();
						if (s4 !== peg_FAILED) {
							peg_savedPos = s0;
							s1 = peg_c0(s2, s3);
							s0 = s1;
						} else {
							peg_currPos = s0;
							s0 = peg_FAILED;
						}
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}

		function peg_parseExpItem() {
			let s0, s1, s2, s3, s4, s5, s6, s7;

			s0 = peg_currPos;
			if (input.charCodeAt(peg_currPos) === 35) {
				s1 = peg_c1;
				peg_currPos++;
			} else {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c2); }
			}
			if (s1 === peg_FAILED) {
				if (input.charCodeAt(peg_currPos) === 64) {
					s1 = peg_c3;
					peg_currPos++;
				} else {
					s1 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c4); }
				}
			}
			if (s1 === peg_FAILED) {
				s1 = null;
			}
			if (s1 !== peg_FAILED) {
				s2 = peg_currPos;
				s3 = peg_parseIden();
				if (s3 !== peg_FAILED) {
					s4 = peg_parseOB();
					if (s4 !== peg_FAILED) {
						s5 = peg_parseValueList();
						if (s5 === peg_FAILED) {
							s5 = null;
						}
						if (s5 !== peg_FAILED) {
							s6 = peg_parseCOMMA();
							if (s6 === peg_FAILED) {
								s6 = null;
							}
							if (s6 !== peg_FAILED) {
								s7 = peg_parseCB();
								if (s7 !== peg_FAILED) {
									peg_savedPos = s2;
									s3 = peg_c5(s1, s3, s5);
									s2 = s3;
								} else {
									peg_currPos = s2;
									s2 = peg_FAILED;
								}
							} else {
								peg_currPos = s2;
								s2 = peg_FAILED;
							}
						} else {
							peg_currPos = s2;
							s2 = peg_FAILED;
						}
					} else {
						peg_currPos = s2;
						s2 = peg_FAILED;
					}
				} else {
					peg_currPos = s2;
					s2 = peg_FAILED;
				}
				if (s2 === peg_FAILED) {
					s2 = peg_currPos;
					s3 = peg_parseIden();
					if (s3 !== peg_FAILED) {
						peg_savedPos = s2;
						s3 = peg_c6(s1, s3);
					}
					s2 = s3;
				}
				if (s2 !== peg_FAILED) {
					peg_savedPos = s0;
					s1 = peg_c7(s1, s2);
					s0 = s1;
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}

		function peg_parseValue() {
			let s0, s1, s2, s3;

			s0 = peg_currPos;
			s1 = peg_parseOB();
			if (s1 !== peg_FAILED) {
				s2 = peg_parseValue();
				if (s2 !== peg_FAILED) {
					s3 = peg_parseCB();
					if (s3 !== peg_FAILED) {
						peg_savedPos = s0;
						s1 = peg_c8(s2);
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}
			if (s0 === peg_FAILED) {
				s0 = peg_currPos;
				s1 = peg_parse_();
				if (s1 !== peg_FAILED) {
					s2 = peg_parse__Value();
					if (s2 !== peg_FAILED) {
						s3 = peg_parse_();
						if (s3 !== peg_FAILED) {
							peg_savedPos = s0;
							s1 = peg_c8(s2);
							s0 = s1;
						} else {
							peg_currPos = s0;
							s0 = peg_FAILED;
						}
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			}

			return s0;
		}

		function peg_parse__Value() {
			let s0;

			s0 = peg_parseNull();
			if (s0 === peg_FAILED) {
				s0 = peg_parseUndefined();
				if (s0 === peg_FAILED) {
					s0 = peg_parseTrue();
					if (s0 === peg_FAILED) {
						s0 = peg_parseFalse();
						if (s0 === peg_FAILED) {
							s0 = peg_parseNumber();
							if (s0 === peg_FAILED) {
								s0 = peg_parseString();
								if (s0 === peg_FAILED) {
									s0 = peg_parseRegEx();
									if (s0 === peg_FAILED) {
										s0 = peg_parseExp();
										if (s0 === peg_FAILED) {
											s0 = peg_parseObject();
											if (s0 === peg_FAILED) {
												s0 = peg_parseArray();
											}
										}
									}
								}
							}
						}
					}
				}
			}

			return s0;
		}

		function peg_parseRegEx() {
			let s0, s1, s2, s3, s4, s5, s6;

			s0 = peg_currPos;
			if (input.charCodeAt(peg_currPos) === 47) {
				s1 = peg_c9;
				peg_currPos++;
			} else {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c10); }
			}
			if (s1 !== peg_FAILED) {
				s2 = [];
				if (peg_c11.test(input.charAt(peg_currPos))) {
					s3 = input.charAt(peg_currPos);
					peg_currPos++;
				} else {
					s3 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c12); }
				}
				if (s3 === peg_FAILED) {
					s3 = peg_parse__SpecialChar();
				}
				while (s3 !== peg_FAILED) {
					s2.push(s3);
					if (peg_c11.test(input.charAt(peg_currPos))) {
						s3 = input.charAt(peg_currPos);
						peg_currPos++;
					} else {
						s3 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c12); }
					}
					if (s3 === peg_FAILED) {
						s3 = peg_parse__SpecialChar();
					}
				}
				if (s2 !== peg_FAILED) {
					if (input.charCodeAt(peg_currPos) === 47) {
						s3 = peg_c9;
						peg_currPos++;
					} else {
						s3 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c10); }
					}
					if (s3 !== peg_FAILED) {
						s4 = peg_currPos;
						s5 = [];
						if (peg_c13.test(input.charAt(peg_currPos))) {
							s6 = input.charAt(peg_currPos);
							peg_currPos++;
						} else {
							s6 = peg_FAILED;
							if (peg_silentFails === 0) { peg_fail(peg_c14); }
						}
						while (s6 !== peg_FAILED) {
							s5.push(s6);
							if (peg_c13.test(input.charAt(peg_currPos))) {
								s6 = input.charAt(peg_currPos);
								peg_currPos++;
							} else {
								s6 = peg_FAILED;
								if (peg_silentFails === 0) { peg_fail(peg_c14); }
							}
						}
						if (s5 !== peg_FAILED) {
							s4 = input.substring(s4, peg_currPos);
						} else {
							s4 = s5;
						}
						if (s4 !== peg_FAILED) {
							peg_savedPos = s0;
							s1 = peg_c15(s2, s4);
							s0 = s1;
						} else {
							peg_currPos = s0;
							s0 = peg_FAILED;
						}
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}

		function peg_parseObject() {
			let s0, s1, s2, s3, s4, s5, s6, s7;

			peg_silentFails++;
			s0 = peg_currPos;
			s1 = peg_parseOCB();
			if (s1 !== peg_FAILED) {
				s2 = peg_currPos;
				s3 = peg_parse__KeyVal();
				if (s3 !== peg_FAILED) {
					s4 = [];
					s5 = peg_currPos;
					s6 = peg_parseCOMMA();
					if (s6 !== peg_FAILED) {
						s7 = peg_parse__KeyVal();
						if (s7 !== peg_FAILED) {
							s6 = [s6, s7];
							s5 = s6;
						} else {
							peg_currPos = s5;
							s5 = peg_FAILED;
						}
					} else {
						peg_currPos = s5;
						s5 = peg_FAILED;
					}
					while (s5 !== peg_FAILED) {
						s4.push(s5);
						s5 = peg_currPos;
						s6 = peg_parseCOMMA();
						if (s6 !== peg_FAILED) {
							s7 = peg_parse__KeyVal();
							if (s7 !== peg_FAILED) {
								s6 = [s6, s7];
								s5 = s6;
							} else {
								peg_currPos = s5;
								s5 = peg_FAILED;
							}
						} else {
							peg_currPos = s5;
							s5 = peg_FAILED;
						}
					}
					if (s4 !== peg_FAILED) {
						peg_savedPos = s2;
						s3 = peg_c17(s3, s4);
						s2 = s3;
					} else {
						peg_currPos = s2;
						s2 = peg_FAILED;
					}
				} else {
					peg_currPos = s2;
					s2 = peg_FAILED;
				}
				if (s2 === peg_FAILED) {
					s2 = null;
				}
				if (s2 !== peg_FAILED) {
					s3 = peg_parseCOMMA();
					if (s3 === peg_FAILED) {
						s3 = null;
					}
					if (s3 !== peg_FAILED) {
						s4 = peg_parseCCB();
						if (s4 !== peg_FAILED) {
							peg_savedPos = s0;
							s1 = peg_c18(s2);
							s0 = s1;
						} else {
							peg_currPos = s0;
							s0 = peg_FAILED;
						}
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}
			peg_silentFails--;
			if (s0 === peg_FAILED) {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c16); }
			}

			return s0;
		}

		function peg_parse__KeyVal() {
			let s0, s1, s2, s3;

			peg_silentFails++;
			s0 = peg_currPos;
			s1 = peg_parseString();
			if (s1 === peg_FAILED) {
				s1 = peg_parse__IdenChain();
			}
			if (s1 !== peg_FAILED) {
				s2 = peg_parseCOLON();
				if (s2 !== peg_FAILED) {
					s3 = peg_parseValue();
					if (s3 !== peg_FAILED) {
						peg_savedPos = s0;
						s1 = peg_c20(s1, s3);
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}
			peg_silentFails--;
			if (s0 === peg_FAILED) {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c19); }
			}

			return s0;
		}

		function peg_parse__IdenChain() {
			let s0, s1, s2, s3, s4, s5, s6;

			peg_silentFails++;
			s0 = peg_currPos;
			s1 = peg_currPos;
			s2 = peg_parseIden();
			if (s2 !== peg_FAILED) {
				s3 = [];
				s4 = peg_currPos;
				s5 = peg_parseDOT();
				if (s5 !== peg_FAILED) {
					s6 = peg_parseIden();
					if (s6 !== peg_FAILED) {
						s5 = [s5, s6];
						s4 = s5;
					} else {
						peg_currPos = s4;
						s4 = peg_FAILED;
					}
				} else {
					peg_currPos = s4;
					s4 = peg_FAILED;
				}
				while (s4 !== peg_FAILED) {
					s3.push(s4);
					s4 = peg_currPos;
					s5 = peg_parseDOT();
					if (s5 !== peg_FAILED) {
						s6 = peg_parseIden();
						if (s6 !== peg_FAILED) {
							s5 = [s5, s6];
							s4 = s5;
						} else {
							peg_currPos = s4;
							s4 = peg_FAILED;
						}
					} else {
						peg_currPos = s4;
						s4 = peg_FAILED;
					}
				}
				if (s3 !== peg_FAILED) {
					s2 = [s2, s3];
					s1 = s2;
				} else {
					peg_currPos = s1;
					s1 = peg_FAILED;
				}
			} else {
				peg_currPos = s1;
				s1 = peg_FAILED;
			}
			if (s1 !== peg_FAILED) {
				s0 = input.substring(s0, peg_currPos);
			} else {
				s0 = s1;
			}
			peg_silentFails--;
			if (s0 === peg_FAILED) {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c21); }
			}

			return s0;
		}

		function peg_parseArray() {
			let s0, s1, s2, s3, s4;

			s0 = peg_currPos;
			s1 = peg_parseOSB();
			if (s1 !== peg_FAILED) {
				s2 = peg_parseValueList();
				if (s2 === peg_FAILED) {
					s2 = null;
				}
				if (s2 !== peg_FAILED) {
					s3 = peg_parseCOMMA();
					if (s3 === peg_FAILED) {
						s3 = null;
					}
					if (s3 !== peg_FAILED) {
						s4 = peg_parseCSB();
						if (s4 !== peg_FAILED) {
							peg_savedPos = s0;
							s1 = peg_c22(s2);
							s0 = s1;
						} else {
							peg_currPos = s0;
							s0 = peg_FAILED;
						}
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}

		function peg_parseValueList() {
			let s0, s1, s2, s3, s4, s5;

			s0 = peg_currPos;
			s1 = peg_parseValue();
			if (s1 !== peg_FAILED) {
				s2 = [];
				s3 = peg_currPos;
				s4 = peg_parseCOMMA();
				if (s4 !== peg_FAILED) {
					s5 = peg_parseValue();
					if (s5 !== peg_FAILED) {
						s4 = [s4, s5];
						s3 = s4;
					} else {
						peg_currPos = s3;
						s3 = peg_FAILED;
					}
				} else {
					peg_currPos = s3;
					s3 = peg_FAILED;
				}
				while (s3 !== peg_FAILED) {
					s2.push(s3);
					s3 = peg_currPos;
					s4 = peg_parseCOMMA();
					if (s4 !== peg_FAILED) {
						s5 = peg_parseValue();
						if (s5 !== peg_FAILED) {
							s4 = [s4, s5];
							s3 = s4;
						} else {
							peg_currPos = s3;
							s3 = peg_FAILED;
						}
					} else {
						peg_currPos = s3;
						s3 = peg_FAILED;
					}
				}
				if (s2 !== peg_FAILED) {
					peg_savedPos = s0;
					s1 = peg_c23(s1, s2);
					s0 = s1;
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}

		function peg_parseNull() {
			let s0, s1;

			peg_silentFails++;
			s0 = peg_currPos;
			if (input.substr(peg_currPos, 4) === peg_c25) {
				s1 = peg_c25;
				peg_currPos += 4;
			} else {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c26); }
			}
			if (s1 !== peg_FAILED) {
				peg_savedPos = s0;
				s1 = peg_c27();
			}
			s0 = s1;
			peg_silentFails--;
			if (s0 === peg_FAILED) {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c24); }
			}

			return s0;
		}

		function peg_parseUndefined() {
			let s0, s1;

			peg_silentFails++;
			s0 = peg_currPos;
			if (input.substr(peg_currPos, 9) === peg_c29) {
				s1 = peg_c29;
				peg_currPos += 9;
			} else {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c30); }
			}
			if (s1 !== peg_FAILED) {
				peg_savedPos = s0;
				s1 = peg_c31();
			}
			s0 = s1;
			peg_silentFails--;
			if (s0 === peg_FAILED) {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c28); }
			}

			return s0;
		}

		function peg_parseFalse() {
			let s0, s1;

			s0 = peg_currPos;
			if (input.substr(peg_currPos, 5) === peg_c32) {
				s1 = peg_c32;
				peg_currPos += 5;
			} else {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c33); }
			}
			if (s1 !== peg_FAILED) {
				peg_savedPos = s0;
				s1 = peg_c34();
			}
			s0 = s1;

			return s0;
		}

		function peg_parseTrue() {
			let s0, s1;

			s0 = peg_currPos;
			if (input.substr(peg_currPos, 4) === peg_c35) {
				s1 = peg_c35;
				peg_currPos += 4;
			} else {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c36); }
			}
			if (s1 !== peg_FAILED) {
				peg_savedPos = s0;
				s1 = peg_c37();
			}
			s0 = s1;

			return s0;
		}

		function peg_parseNumber() {
			let s0, s1, s2, s3, s4, s5, s6, s7, s8;

			peg_silentFails++;
			s0 = peg_currPos;
			if (input.charCodeAt(peg_currPos) === 45) {
				s1 = peg_c39;
				peg_currPos++;
			} else {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c40); }
			}
			if (s1 === peg_FAILED) {
				s1 = null;
			}
			if (s1 !== peg_FAILED) {
				if (input.substr(peg_currPos, 2) === peg_c41) {
					s2 = peg_c41;
					peg_currPos += 2;
				} else {
					s2 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c42); }
				}
				if (s2 !== peg_FAILED) {
					s3 = peg_currPos;
					s4 = [];
					s5 = peg_parseHexDigit();
					if (s5 !== peg_FAILED) {
						while (s5 !== peg_FAILED) {
							s4.push(s5);
							s5 = peg_parseHexDigit();
						}
					} else {
						s4 = peg_FAILED;
					}
					if (s4 !== peg_FAILED) {
						s3 = input.substring(s3, peg_currPos);
					} else {
						s3 = s4;
					}
					if (s3 !== peg_FAILED) {
						peg_savedPos = s0;
						s1 = peg_c43(s1, s3);
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}
			if (s0 === peg_FAILED) {
				s0 = peg_currPos;
				if (input.charCodeAt(peg_currPos) === 45) {
					s1 = peg_c39;
					peg_currPos++;
				} else {
					s1 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c40); }
				}
				if (s1 === peg_FAILED) {
					s1 = null;
				}
				if (s1 !== peg_FAILED) {
					if (input.substr(peg_currPos, 2) === peg_c44) {
						s2 = peg_c44;
						peg_currPos += 2;
					} else {
						s2 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c45); }
					}
					if (s2 !== peg_FAILED) {
						s3 = peg_currPos;
						s4 = [];
						if (peg_c46.test(input.charAt(peg_currPos))) {
							s5 = input.charAt(peg_currPos);
							peg_currPos++;
						} else {
							s5 = peg_FAILED;
							if (peg_silentFails === 0) { peg_fail(peg_c47); }
						}
						if (s5 !== peg_FAILED) {
							while (s5 !== peg_FAILED) {
								s4.push(s5);
								if (peg_c46.test(input.charAt(peg_currPos))) {
									s5 = input.charAt(peg_currPos);
									peg_currPos++;
								} else {
									s5 = peg_FAILED;
									if (peg_silentFails === 0) { peg_fail(peg_c47); }
								}
							}
						} else {
							s4 = peg_FAILED;
						}
						if (s4 !== peg_FAILED) {
							s3 = input.substring(s3, peg_currPos);
						} else {
							s3 = s4;
						}
						if (s3 !== peg_FAILED) {
							peg_savedPos = s0;
							s1 = peg_c48(s1, s3);
							s0 = s1;
						} else {
							peg_currPos = s0;
							s0 = peg_FAILED;
						}
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
				if (s0 === peg_FAILED) {
					s0 = peg_currPos;
					if (input.charCodeAt(peg_currPos) === 45) {
						s1 = peg_c39;
						peg_currPos++;
					} else {
						s1 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c40); }
					}
					if (s1 === peg_FAILED) {
						s1 = null;
					}
					if (s1 !== peg_FAILED) {
						if (input.substr(peg_currPos, 2) === peg_c49) {
							s2 = peg_c49;
							peg_currPos += 2;
						} else {
							s2 = peg_FAILED;
							if (peg_silentFails === 0) { peg_fail(peg_c50); }
						}
						if (s2 !== peg_FAILED) {
							s3 = peg_currPos;
							s4 = [];
							if (peg_c51.test(input.charAt(peg_currPos))) {
								s5 = input.charAt(peg_currPos);
								peg_currPos++;
							} else {
								s5 = peg_FAILED;
								if (peg_silentFails === 0) { peg_fail(peg_c52); }
							}
							if (s5 !== peg_FAILED) {
								while (s5 !== peg_FAILED) {
									s4.push(s5);
									if (peg_c51.test(input.charAt(peg_currPos))) {
										s5 = input.charAt(peg_currPos);
										peg_currPos++;
									} else {
										s5 = peg_FAILED;
										if (peg_silentFails === 0) { peg_fail(peg_c52); }
									}
								}
							} else {
								s4 = peg_FAILED;
							}
							if (s4 !== peg_FAILED) {
								s3 = input.substring(s3, peg_currPos);
							} else {
								s3 = s4;
							}
							if (s3 !== peg_FAILED) {
								peg_savedPos = s0;
								s1 = peg_c53(s1, s3);
								s0 = s1;
							} else {
								peg_currPos = s0;
								s0 = peg_FAILED;
							}
						} else {
							peg_currPos = s0;
							s0 = peg_FAILED;
						}
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
					if (s0 === peg_FAILED) {
						s0 = peg_currPos;
						if (input.charCodeAt(peg_currPos) === 45) {
							s1 = peg_c39;
							peg_currPos++;
						} else {
							s1 = peg_FAILED;
							if (peg_silentFails === 0) { peg_fail(peg_c40); }
						}
						if (s1 === peg_FAILED) {
							s1 = null;
						}
						if (s1 !== peg_FAILED) {
							s2 = [];
							s3 = peg_parseDigit();
							if (s3 !== peg_FAILED) {
								while (s3 !== peg_FAILED) {
									s2.push(s3);
									s3 = peg_parseDigit();
								}
							} else {
								s2 = peg_FAILED;
							}
							if (s2 !== peg_FAILED) {
								s3 = peg_currPos;
								if (input.charCodeAt(peg_currPos) === 46) {
									s4 = peg_c54;
									peg_currPos++;
								} else {
									s4 = peg_FAILED;
									if (peg_silentFails === 0) { peg_fail(peg_c55); }
								}
								if (s4 !== peg_FAILED) {
									s5 = [];
									s6 = peg_parseDigit();
									if (s6 !== peg_FAILED) {
										while (s6 !== peg_FAILED) {
											s5.push(s6);
											s6 = peg_parseDigit();
										}
									} else {
										s5 = peg_FAILED;
									}
									if (s5 !== peg_FAILED) {
										s4 = [s4, s5];
										s3 = s4;
									} else {
										peg_currPos = s3;
										s3 = peg_FAILED;
									}
								} else {
									peg_currPos = s3;
									s3 = peg_FAILED;
								}
								if (s3 === peg_FAILED) {
									s3 = null;
								}
								if (s3 !== peg_FAILED) {
									s4 = peg_currPos;
									if (peg_c56.test(input.charAt(peg_currPos))) {
										s5 = input.charAt(peg_currPos);
										peg_currPos++;
									} else {
										s5 = peg_FAILED;
										if (peg_silentFails === 0) { peg_fail(peg_c57); }
									}
									if (s5 !== peg_FAILED) {
										if (input.charCodeAt(peg_currPos) === 45) {
											s6 = peg_c39;
											peg_currPos++;
										} else {
											s6 = peg_FAILED;
											if (peg_silentFails === 0) { peg_fail(peg_c40); }
										}
										if (s6 === peg_FAILED) {
											if (input.charCodeAt(peg_currPos) === 43) {
												s6 = peg_c58;
												peg_currPos++;
											} else {
												s6 = peg_FAILED;
												if (peg_silentFails === 0) { peg_fail(peg_c59); }
											}
										}
										if (s6 === peg_FAILED) {
											s6 = null;
										}
										if (s6 !== peg_FAILED) {
											s7 = [];
											s8 = peg_parseDigit();
											if (s8 !== peg_FAILED) {
												while (s8 !== peg_FAILED) {
													s7.push(s8);
													s8 = peg_parseDigit();
												}
											} else {
												s7 = peg_FAILED;
											}
											if (s7 !== peg_FAILED) {
												s5 = [s5, s6, s7];
												s4 = s5;
											} else {
												peg_currPos = s4;
												s4 = peg_FAILED;
											}
										} else {
											peg_currPos = s4;
											s4 = peg_FAILED;
										}
									} else {
										peg_currPos = s4;
										s4 = peg_FAILED;
									}
									if (s4 === peg_FAILED) {
										s4 = null;
									}
									if (s4 !== peg_FAILED) {
										peg_savedPos = s0;
										s1 = peg_c60();
										s0 = s1;
									} else {
										peg_currPos = s0;
										s0 = peg_FAILED;
									}
								} else {
									peg_currPos = s0;
									s0 = peg_FAILED;
								}
							} else {
								peg_currPos = s0;
								s0 = peg_FAILED;
							}
						} else {
							peg_currPos = s0;
							s0 = peg_FAILED;
						}
					}
				}
			}
			peg_silentFails--;
			if (s0 === peg_FAILED) {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c38); }
			}

			return s0;
		}

		function peg_parseString() {
			let s0, s1, s2, s3;

			peg_silentFails++;
			s0 = peg_currPos;
			if (input.charCodeAt(peg_currPos) === 34) {
				s1 = peg_c62;
				peg_currPos++;
			} else {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c63); }
			}
			if (s1 !== peg_FAILED) {
				s2 = [];
				if (peg_c64.test(input.charAt(peg_currPos))) {
					s3 = input.charAt(peg_currPos);
					peg_currPos++;
				} else {
					s3 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c65); }
				}
				if (s3 === peg_FAILED) {
					s3 = peg_parse__SpecialChar();
				}
				while (s3 !== peg_FAILED) {
					s2.push(s3);
					if (peg_c64.test(input.charAt(peg_currPos))) {
						s3 = input.charAt(peg_currPos);
						peg_currPos++;
					} else {
						s3 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c65); }
					}
					if (s3 === peg_FAILED) {
						s3 = peg_parse__SpecialChar();
					}
				}
				if (s2 !== peg_FAILED) {
					if (input.charCodeAt(peg_currPos) === 34) {
						s3 = peg_c62;
						peg_currPos++;
					} else {
						s3 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c63); }
					}
					if (s3 !== peg_FAILED) {
						peg_savedPos = s0;
						s1 = peg_c66(s2);
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}
			if (s0 === peg_FAILED) {
				s0 = peg_currPos;
				if (input.charCodeAt(peg_currPos) === 39) {
					s1 = peg_c67;
					peg_currPos++;
				} else {
					s1 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c68); }
				}
				if (s1 !== peg_FAILED) {
					s2 = [];
					if (peg_c69.test(input.charAt(peg_currPos))) {
						s3 = input.charAt(peg_currPos);
						peg_currPos++;
					} else {
						s3 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c70); }
					}
					if (s3 === peg_FAILED) {
						s3 = peg_parse__SpecialChar();
					}
					while (s3 !== peg_FAILED) {
						s2.push(s3);
						if (peg_c69.test(input.charAt(peg_currPos))) {
							s3 = input.charAt(peg_currPos);
							peg_currPos++;
						} else {
							s3 = peg_FAILED;
							if (peg_silentFails === 0) { peg_fail(peg_c70); }
						}
						if (s3 === peg_FAILED) {
							s3 = peg_parse__SpecialChar();
						}
					}
					if (s2 !== peg_FAILED) {
						if (input.charCodeAt(peg_currPos) === 39) {
							s3 = peg_c67;
							peg_currPos++;
						} else {
							s3 = peg_FAILED;
							if (peg_silentFails === 0) { peg_fail(peg_c68); }
						}
						if (s3 !== peg_FAILED) {
							peg_savedPos = s0;
							s1 = peg_c66(s2);
							s0 = s1;
						} else {
							peg_currPos = s0;
							s0 = peg_FAILED;
						}
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
				if (s0 === peg_FAILED) {
					s0 = peg_currPos;
					if (input.charCodeAt(peg_currPos) === 96) {
						s1 = peg_c71;
						peg_currPos++;
					} else {
						s1 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c72); }
					}
					if (s1 !== peg_FAILED) {
						s2 = [];
						if (peg_c73.test(input.charAt(peg_currPos))) {
							s3 = input.charAt(peg_currPos);
							peg_currPos++;
						} else {
							s3 = peg_FAILED;
							if (peg_silentFails === 0) { peg_fail(peg_c74); }
						}
						if (s3 === peg_FAILED) {
							s3 = peg_parse__SpecialChar();
						}
						while (s3 !== peg_FAILED) {
							s2.push(s3);
							if (peg_c73.test(input.charAt(peg_currPos))) {
								s3 = input.charAt(peg_currPos);
								peg_currPos++;
							} else {
								s3 = peg_FAILED;
								if (peg_silentFails === 0) { peg_fail(peg_c74); }
							}
							if (s3 === peg_FAILED) {
								s3 = peg_parse__SpecialChar();
							}
						}
						if (s2 !== peg_FAILED) {
							if (input.charCodeAt(peg_currPos) === 96) {
								s3 = peg_c71;
								peg_currPos++;
							} else {
								s3 = peg_FAILED;
								if (peg_silentFails === 0) { peg_fail(peg_c72); }
							}
							if (s3 !== peg_FAILED) {
								peg_savedPos = s0;
								s1 = peg_c66(s2);
								s0 = s1;
							} else {
								peg_currPos = s0;
								s0 = peg_FAILED;
							}
						} else {
							peg_currPos = s0;
							s0 = peg_FAILED;
						}
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				}
			}
			peg_silentFails--;
			if (s0 === peg_FAILED) {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c61); }
			}

			return s0;
		}

		function peg_parse__SpecialChar() {
			let s0, s1, s2, s3, s4, s5, s6, s7;

			s0 = peg_currPos;
			if (input.substr(peg_currPos, 2) === peg_c75) {
				s1 = peg_c75;
				peg_currPos += 2;
			} else {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c76); }
			}
			if (s1 !== peg_FAILED) {
				peg_savedPos = s0;
				s1 = peg_c77();
			}
			s0 = s1;
			if (s0 === peg_FAILED) {
				s0 = peg_currPos;
				if (input.substr(peg_currPos, 2) === peg_c78) {
					s1 = peg_c78;
					peg_currPos += 2;
				} else {
					s1 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c79); }
				}
				if (s1 !== peg_FAILED) {
					peg_savedPos = s0;
					s1 = peg_c80();
				}
				s0 = s1;
				if (s0 === peg_FAILED) {
					s0 = peg_currPos;
					if (input.substr(peg_currPos, 2) === peg_c81) {
						s1 = peg_c81;
						peg_currPos += 2;
					} else {
						s1 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c82); }
					}
					if (s1 !== peg_FAILED) {
						peg_savedPos = s0;
						s1 = peg_c83();
					}
					s0 = s1;
					if (s0 === peg_FAILED) {
						s0 = peg_currPos;
						if (input.substr(peg_currPos, 2) === peg_c84) {
							s1 = peg_c84;
							peg_currPos += 2;
						} else {
							s1 = peg_FAILED;
							if (peg_silentFails === 0) { peg_fail(peg_c85); }
						}
						if (s1 !== peg_FAILED) {
							peg_savedPos = s0;
							s1 = peg_c86();
						}
						s0 = s1;
						if (s0 === peg_FAILED) {
							s0 = peg_currPos;
							if (input.substr(peg_currPos, 2) === peg_c87) {
								s1 = peg_c87;
								peg_currPos += 2;
							} else {
								s1 = peg_FAILED;
								if (peg_silentFails === 0) { peg_fail(peg_c88); }
							}
							if (s1 !== peg_FAILED) {
								peg_savedPos = s0;
								s1 = peg_c89();
							}
							s0 = s1;
							if (s0 === peg_FAILED) {
								s0 = peg_currPos;
								if (input.substr(peg_currPos, 2) === peg_c90) {
									s1 = peg_c90;
									peg_currPos += 2;
								} else {
									s1 = peg_FAILED;
									if (peg_silentFails === 0) { peg_fail(peg_c91); }
								}
								if (s1 !== peg_FAILED) {
									peg_savedPos = s0;
									s1 = peg_c92();
								}
								s0 = s1;
								if (s0 === peg_FAILED) {
									s0 = peg_currPos;
									if (input.substr(peg_currPos, 2) === peg_c93) {
										s1 = peg_c93;
										peg_currPos += 2;
									} else {
										s1 = peg_FAILED;
										if (peg_silentFails === 0) { peg_fail(peg_c94); }
									}
									if (s1 !== peg_FAILED) {
										peg_savedPos = s0;
										s1 = peg_c95();
									}
									s0 = s1;
									if (s0 === peg_FAILED) {
										s0 = peg_currPos;
										if (input.substr(peg_currPos, 2) === peg_c96) {
											s1 = peg_c96;
											peg_currPos += 2;
										} else {
											s1 = peg_FAILED;
											if (peg_silentFails === 0) { peg_fail(peg_c97); }
										}
										if (s1 !== peg_FAILED) {
											peg_savedPos = s0;
											s1 = peg_c98();
										}
										s0 = s1;
										if (s0 === peg_FAILED) {
											s0 = peg_currPos;
											if (input.substr(peg_currPos, 2) === peg_c99) {
												s1 = peg_c99;
												peg_currPos += 2;
											} else {
												s1 = peg_FAILED;
												if (peg_silentFails === 0) { peg_fail(peg_c100); }
											}
											if (s1 !== peg_FAILED) {
												peg_savedPos = s0;
												s1 = peg_c101();
											}
											s0 = s1;
											if (s0 === peg_FAILED) {
												s0 = peg_currPos;
												if (input.substr(peg_currPos, 2) === peg_c102) {
													s1 = peg_c102;
													peg_currPos += 2;
												} else {
													s1 = peg_FAILED;
													if (peg_silentFails === 0) { peg_fail(peg_c103); }
												}
												if (s1 !== peg_FAILED) {
													s2 = peg_currPos;
													s3 = peg_currPos;
													if (peg_c46.test(input.charAt(peg_currPos))) {
														s4 = input.charAt(peg_currPos);
														peg_currPos++;
													} else {
														s4 = peg_FAILED;
														if (peg_silentFails === 0) { peg_fail(peg_c47); }
													}
													if (s4 !== peg_FAILED) {
														if (peg_c46.test(input.charAt(peg_currPos))) {
															s5 = input.charAt(peg_currPos);
															peg_currPos++;
														} else {
															s5 = peg_FAILED;
															if (peg_silentFails === 0) { peg_fail(peg_c47); }
														}
														if (s5 === peg_FAILED) {
															s5 = null;
														}
														if (s5 !== peg_FAILED) {
															if (peg_c46.test(input.charAt(peg_currPos))) {
																s6 = input.charAt(peg_currPos);
																peg_currPos++;
															} else {
																s6 = peg_FAILED;
																if (peg_silentFails === 0) { peg_fail(peg_c47); }
															}
															if (s6 === peg_FAILED) {
																s6 = null;
															}
															if (s6 !== peg_FAILED) {
																s4 = [s4, s5, s6];
																s3 = s4;
															} else {
																peg_currPos = s3;
																s3 = peg_FAILED;
															}
														} else {
															peg_currPos = s3;
															s3 = peg_FAILED;
														}
													} else {
														peg_currPos = s3;
														s3 = peg_FAILED;
													}
													if (s3 !== peg_FAILED) {
														s2 = input.substring(s2, peg_currPos);
													} else {
														s2 = s3;
													}
													if (s2 !== peg_FAILED) {
														peg_savedPos = s0;
														s1 = peg_c104(s2);
														s0 = s1;
													} else {
														peg_currPos = s0;
														s0 = peg_FAILED;
													}
												} else {
													peg_currPos = s0;
													s0 = peg_FAILED;
												}
												if (s0 === peg_FAILED) {
													s0 = peg_currPos;
													if (input.substr(peg_currPos, 2) === peg_c105) {
														s1 = peg_c105;
														peg_currPos += 2;
													} else {
														s1 = peg_FAILED;
														if (peg_silentFails === 0) { peg_fail(peg_c106); }
													}
													if (s1 !== peg_FAILED) {
														s2 = peg_currPos;
														s3 = peg_currPos;
														s4 = peg_parseHexDigit();
														if (s4 !== peg_FAILED) {
															s5 = peg_parseHexDigit();
															if (s5 === peg_FAILED) {
																s5 = null;
															}
															if (s5 !== peg_FAILED) {
																s4 = [s4, s5];
																s3 = s4;
															} else {
																peg_currPos = s3;
																s3 = peg_FAILED;
															}
														} else {
															peg_currPos = s3;
															s3 = peg_FAILED;
														}
														if (s3 !== peg_FAILED) {
															s2 = input.substring(s2, peg_currPos);
														} else {
															s2 = s3;
														}
														if (s2 !== peg_FAILED) {
															peg_savedPos = s0;
															s1 = peg_c107(s2);
															s0 = s1;
														} else {
															peg_currPos = s0;
															s0 = peg_FAILED;
														}
													} else {
														peg_currPos = s0;
														s0 = peg_FAILED;
													}
													if (s0 === peg_FAILED) {
														s0 = peg_currPos;
														if (input.substr(peg_currPos, 2) === peg_c108) {
															s1 = peg_c108;
															peg_currPos += 2;
														} else {
															s1 = peg_FAILED;
															if (peg_silentFails === 0) { peg_fail(peg_c109); }
														}
														if (s1 !== peg_FAILED) {
															s2 = peg_currPos;
															s3 = peg_currPos;
															s4 = peg_parseHexDigit();
															if (s4 !== peg_FAILED) {
																s5 = peg_parseHexDigit();
																if (s5 !== peg_FAILED) {
																	s6 = peg_parseHexDigit();
																	if (s6 !== peg_FAILED) {
																		s7 = peg_parseHexDigit();
																		if (s7 !== peg_FAILED) {
																			s4 = [s4, s5, s6, s7];
																			s3 = s4;
																		} else {
																			peg_currPos = s3;
																			s3 = peg_FAILED;
																		}
																	} else {
																		peg_currPos = s3;
																		s3 = peg_FAILED;
																	}
																} else {
																	peg_currPos = s3;
																	s3 = peg_FAILED;
																}
															} else {
																peg_currPos = s3;
																s3 = peg_FAILED;
															}
															if (s3 !== peg_FAILED) {
																s2 = input.substring(s2, peg_currPos);
															} else {
																s2 = s3;
															}
															if (s2 !== peg_FAILED) {
																peg_savedPos = s0;
																s1 = peg_c107(s2);
																s0 = s1;
															} else {
																peg_currPos = s0;
																s0 = peg_FAILED;
															}
														} else {
															peg_currPos = s0;
															s0 = peg_FAILED;
														}
														if (s0 === peg_FAILED) {
															if (peg_c110.test(input.charAt(peg_currPos))) {
																s0 = input.charAt(peg_currPos);
																peg_currPos++;
															} else {
																s0 = peg_FAILED;
																if (peg_silentFails === 0) { peg_fail(peg_c111); }
															}
															if (s0 === peg_FAILED) {
																if (peg_c112.test(input.charAt(peg_currPos))) {
																	s0 = input.charAt(peg_currPos);
																	peg_currPos++;
																} else {
																	s0 = peg_FAILED;
																	if (peg_silentFails === 0) { peg_fail(peg_c113); }
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}

			return s0;
		}

		function peg_parse_() {
			let s0, s1;

			peg_silentFails++;
			s0 = [];
			if (peg_c115.test(input.charAt(peg_currPos))) {
				s1 = input.charAt(peg_currPos);
				peg_currPos++;
			} else {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c116); }
			}
			if (s1 === peg_FAILED) {
				s1 = peg_parseComment();
			}
			while (s1 !== peg_FAILED) {
				s0.push(s1);
				if (peg_c115.test(input.charAt(peg_currPos))) {
					s1 = input.charAt(peg_currPos);
					peg_currPos++;
				} else {
					s1 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c116); }
				}
				if (s1 === peg_FAILED) {
					s1 = peg_parseComment();
				}
			}
			peg_silentFails--;
			if (s0 === peg_FAILED) {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c114); }
			}

			return s0;
		}

		function peg_parseComment() {
			let s0, s1, s2, s3, s4, s5, s6;

			peg_silentFails++;
			s0 = peg_currPos;
			if (input.substr(peg_currPos, 2) === peg_c118) {
				s1 = peg_c118;
				peg_currPos += 2;
			} else {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c119); }
			}
			if (s1 !== peg_FAILED) {
				s2 = [];
				if (peg_c120.test(input.charAt(peg_currPos))) {
					s3 = input.charAt(peg_currPos);
					peg_currPos++;
				} else {
					s3 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c121); }
				}
				if (s3 === peg_FAILED) {
					s3 = peg_currPos;
					if (input.charCodeAt(peg_currPos) === 42) {
						s4 = peg_c122;
						peg_currPos++;
					} else {
						s4 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c123); }
					}
					if (s4 !== peg_FAILED) {
						s5 = peg_currPos;
						peg_silentFails++;
						if (peg_c124.test(input.charAt(peg_currPos))) {
							s6 = input.charAt(peg_currPos);
							peg_currPos++;
						} else {
							s6 = peg_FAILED;
							if (peg_silentFails === 0) { peg_fail(peg_c125); }
						}
						peg_silentFails--;
						if (s6 === peg_FAILED) {
							s5 = void 0;
						} else {
							peg_currPos = s5;
							s5 = peg_FAILED;
						}
						if (s5 !== peg_FAILED) {
							s4 = [s4, s5];
							s3 = s4;
						} else {
							peg_currPos = s3;
							s3 = peg_FAILED;
						}
					} else {
						peg_currPos = s3;
						s3 = peg_FAILED;
					}
				}
				while (s3 !== peg_FAILED) {
					s2.push(s3);
					if (peg_c120.test(input.charAt(peg_currPos))) {
						s3 = input.charAt(peg_currPos);
						peg_currPos++;
					} else {
						s3 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c121); }
					}
					if (s3 === peg_FAILED) {
						s3 = peg_currPos;
						if (input.charCodeAt(peg_currPos) === 42) {
							s4 = peg_c122;
							peg_currPos++;
						} else {
							s4 = peg_FAILED;
							if (peg_silentFails === 0) { peg_fail(peg_c123); }
						}
						if (s4 !== peg_FAILED) {
							s5 = peg_currPos;
							peg_silentFails++;
							if (peg_c124.test(input.charAt(peg_currPos))) {
								s6 = input.charAt(peg_currPos);
								peg_currPos++;
							} else {
								s6 = peg_FAILED;
								if (peg_silentFails === 0) { peg_fail(peg_c125); }
							}
							peg_silentFails--;
							if (s6 === peg_FAILED) {
								s5 = void 0;
							} else {
								peg_currPos = s5;
								s5 = peg_FAILED;
							}
							if (s5 !== peg_FAILED) {
								s4 = [s4, s5];
								s3 = s4;
							} else {
								peg_currPos = s3;
								s3 = peg_FAILED;
							}
						} else {
							peg_currPos = s3;
							s3 = peg_FAILED;
						}
					}
				}
				if (s2 !== peg_FAILED) {
					if (input.substr(peg_currPos, 2) === peg_c126) {
						s3 = peg_c126;
						peg_currPos += 2;
					} else {
						s3 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c127); }
					}
					if (s3 !== peg_FAILED) {
						s1 = [s1, s2, s3];
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}
			if (s0 === peg_FAILED) {
				s0 = peg_currPos;
				if (input.substr(peg_currPos, 2) === peg_c128) {
					s1 = peg_c128;
					peg_currPos += 2;
				} else {
					s1 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c129); }
				}
				if (s1 !== peg_FAILED) {
					s2 = [];
					if (peg_c130.test(input.charAt(peg_currPos))) {
						s3 = input.charAt(peg_currPos);
						peg_currPos++;
					} else {
						s3 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c131); }
					}
					while (s3 !== peg_FAILED) {
						s2.push(s3);
						if (peg_c130.test(input.charAt(peg_currPos))) {
							s3 = input.charAt(peg_currPos);
							peg_currPos++;
						} else {
							s3 = peg_FAILED;
							if (peg_silentFails === 0) { peg_fail(peg_c131); }
						}
					}
					if (s2 !== peg_FAILED) {
						if (peg_c110.test(input.charAt(peg_currPos))) {
							s3 = input.charAt(peg_currPos);
							peg_currPos++;
						} else {
							s3 = peg_FAILED;
							if (peg_silentFails === 0) { peg_fail(peg_c111); }
						}
						if (s3 === peg_FAILED) {
							s3 = null;
						}
						if (s3 !== peg_FAILED) {
							s1 = [s1, s2, s3];
							s0 = s1;
						} else {
							peg_currPos = s0;
							s0 = peg_FAILED;
						}
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			}
			peg_silentFails--;
			if (s0 === peg_FAILED) {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c117); }
			}

			return s0;
		}

		function peg_parseHexDigit() {
			let s0, s1;

			peg_silentFails++;
			if (peg_c133.test(input.charAt(peg_currPos))) {
				s0 = input.charAt(peg_currPos);
				peg_currPos++;
			} else {
				s0 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c134); }
			}
			peg_silentFails--;
			if (s0 === peg_FAILED) {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c132); }
			}

			return s0;
		}

		function peg_parseDigit() {
			let s0, s1;

			peg_silentFails++;
			if (peg_c136.test(input.charAt(peg_currPos))) {
				s0 = input.charAt(peg_currPos);
				peg_currPos++;
			} else {
				s0 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c137); }
			}
			peg_silentFails--;
			if (s0 === peg_FAILED) {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c135); }
			}

			return s0;
		}

		function peg_parseIden() {
			let s0, s1, s2, s3, s4;

			peg_silentFails++;
			s0 = peg_currPos;
			s1 = peg_currPos;
			if (peg_c139.test(input.charAt(peg_currPos))) {
				s2 = input.charAt(peg_currPos);
				peg_currPos++;
			} else {
				s2 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c140); }
			}
			if (s2 !== peg_FAILED) {
				s3 = [];
				if (peg_c141.test(input.charAt(peg_currPos))) {
					s4 = input.charAt(peg_currPos);
					peg_currPos++;
				} else {
					s4 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c142); }
				}
				while (s4 !== peg_FAILED) {
					s3.push(s4);
					if (peg_c141.test(input.charAt(peg_currPos))) {
						s4 = input.charAt(peg_currPos);
						peg_currPos++;
					} else {
						s4 = peg_FAILED;
						if (peg_silentFails === 0) { peg_fail(peg_c142); }
					}
				}
				if (s3 !== peg_FAILED) {
					s2 = [s2, s3];
					s1 = s2;
				} else {
					peg_currPos = s1;
					s1 = peg_FAILED;
				}
			} else {
				peg_currPos = s1;
				s1 = peg_FAILED;
			}
			if (s1 !== peg_FAILED) {
				s0 = input.substring(s0, peg_currPos);
			} else {
				s0 = s1;
			}
			peg_silentFails--;
			if (s0 === peg_FAILED) {
				s1 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c138); }
			}

			return s0;
		}

		function peg_parseDOT() {
			let s0;

			if (input.charCodeAt(peg_currPos) === 46) {
				s0 = peg_c54;
				peg_currPos++;
			} else {
				s0 = peg_FAILED;
				if (peg_silentFails === 0) { peg_fail(peg_c55); }
			}

			return s0;
		}

		function peg_parseCOMMA() {
			let s0, s1, s2, s3;

			s0 = peg_currPos;
			s1 = peg_parse_();
			if (s1 !== peg_FAILED) {
				if (input.charCodeAt(peg_currPos) === 44) {
					s2 = peg_c143;
					peg_currPos++;
				} else {
					s2 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c144); }
				}
				if (s2 !== peg_FAILED) {
					s3 = peg_parse_();
					if (s3 !== peg_FAILED) {
						s1 = [s1, s2, s3];
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}

		function peg_parseCOLON() {
			let s0, s1, s2, s3;

			s0 = peg_currPos;
			s1 = peg_parse_();
			if (s1 !== peg_FAILED) {
				if (input.charCodeAt(peg_currPos) === 58) {
					s2 = peg_c145;
					peg_currPos++;
				} else {
					s2 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c146); }
				}
				if (s2 !== peg_FAILED) {
					s3 = peg_parse_();
					if (s3 !== peg_FAILED) {
						s1 = [s1, s2, s3];
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}

		function peg_parseOSB() {
			let s0, s1, s2, s3;

			s0 = peg_currPos;
			s1 = peg_parse_();
			if (s1 !== peg_FAILED) {
				if (input.charCodeAt(peg_currPos) === 91) {
					s2 = peg_c147;
					peg_currPos++;
				} else {
					s2 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c148); }
				}
				if (s2 !== peg_FAILED) {
					s3 = peg_parse_();
					if (s3 !== peg_FAILED) {
						s1 = [s1, s2, s3];
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}

		function peg_parseCSB() {
			let s0, s1, s2, s3;

			s0 = peg_currPos;
			s1 = peg_parse_();
			if (s1 !== peg_FAILED) {
				if (input.charCodeAt(peg_currPos) === 93) {
					s2 = peg_c149;
					peg_currPos++;
				} else {
					s2 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c150); }
				}
				if (s2 !== peg_FAILED) {
					s3 = peg_parse_();
					if (s3 !== peg_FAILED) {
						s1 = [s1, s2, s3];
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}

		function peg_parseOCB() {
			let s0, s1, s2, s3;

			s0 = peg_currPos;
			s1 = peg_parse_();
			if (s1 !== peg_FAILED) {
				if (input.charCodeAt(peg_currPos) === 123) {
					s2 = peg_c151;
					peg_currPos++;
				} else {
					s2 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c152); }
				}
				if (s2 !== peg_FAILED) {
					s3 = peg_parse_();
					if (s3 !== peg_FAILED) {
						s1 = [s1, s2, s3];
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}

		function peg_parseCCB() {
			let s0, s1, s2, s3;

			s0 = peg_currPos;
			s1 = peg_parse_();
			if (s1 !== peg_FAILED) {
				if (input.charCodeAt(peg_currPos) === 125) {
					s2 = peg_c153;
					peg_currPos++;
				} else {
					s2 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c154); }
				}
				if (s2 !== peg_FAILED) {
					s3 = peg_parse_();
					if (s3 !== peg_FAILED) {
						s1 = [s1, s2, s3];
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}

		function peg_parseOB() {
			let s0, s1, s2, s3;

			s0 = peg_currPos;
			s1 = peg_parse_();
			if (s1 !== peg_FAILED) {
				if (input.charCodeAt(peg_currPos) === 40) {
					s2 = peg_c155;
					peg_currPos++;
				} else {
					s2 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c156); }
				}
				if (s2 !== peg_FAILED) {
					s3 = peg_parse_();
					if (s3 !== peg_FAILED) {
						s1 = [s1, s2, s3];
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}

		function peg_parseCB() {
			let s0, s1, s2, s3;

			s0 = peg_currPos;
			s1 = peg_parse_();
			if (s1 !== peg_FAILED) {
				if (input.charCodeAt(peg_currPos) === 41) {
					s2 = peg_c157;
					peg_currPos++;
				} else {
					s2 = peg_FAILED;
					if (peg_silentFails === 0) { peg_fail(peg_c158); }
				}
				if (s2 !== peg_FAILED) {
					s3 = peg_parse_();
					if (s3 !== peg_FAILED) {
						s1 = [s1, s2, s3];
						s0 = s1;
					} else {
						peg_currPos = s0;
						s0 = peg_FAILED;
					}
				} else {
					peg_currPos = s0;
					s0 = peg_FAILED;
				}
			} else {
				peg_currPos = s0;
				s0 = peg_FAILED;
			}

			return s0;
		}


		function mkArray(head, tail) {
			return [head, ...tail.map(v => v[1])];
		}
		peg_result = peg_startRuleFunction();

		if (peg_result !== peg_FAILED && peg_currPos === input.length) {
			return peg_result;
		} else {
			if (peg_result !== peg_FAILED && peg_currPos < input.length) {
				peg_fail(peg_endExpectation());
			}

			throw peg_buildStructuredError(
				peg_maxFailExpected,
				peg_maxFailPos < input.length ? input.charAt(peg_maxFailPos) : null,
				peg_maxFailPos < input.length
					? peg_computeLocation(peg_maxFailPos, peg_maxFailPos + 1)
					: peg_computeLocation(peg_maxFailPos, peg_maxFailPos)
			);
		}
	}

	return {
		SyntaxError: peg_SyntaxError,
		parse: peg_parse
	};
})();