{
	function mkArray(head, tail) {
		return [head, ...tail.map(v => v[1])];
	}
	class Expression {
		constructor(exp) {
			this.exp = exp;
		}
	}
}

Exp = _ head:ExpItem tail:(DOT ExpItem)* _ { return new Expression(mkArray(head, tail)); }

ExpItem = sc:("#" / "@")? i:(
		nm:Iden OB arg:ValueList? COMMA? CB { return {nm: nm, arg: arg ?? []}; }
		/ nm:Iden { return {nm: nm}; }
	) { return {sc: sc ?? "~", ...i}; }
	
// ----- JSON++ -----
Value
	= OB v:Value CB { return v; }
	/ _ v:__Value _ { return v; }
//	/ _ { return undefined; }
__Value
	= Null / Undefined / True / False
	/ Number / String / RegEx / Exp
	/ Object / Array

// ----- RegEx -----
RegEx = '/' chars:(
		[^\0-\x1F\x5C\x2F] // Printable except '\' and '/'
		/ __SpecialChar
	)* '/' fg:$[iumg]* { return new RegExp(chars.join(""), fg); }

// ----- Object -----
Object "object"
	= OCB members:(
		head:__KeyVal tail:(COMMA __KeyVal)* { return Object.fromEntries(mkArray(head, tail)); }
	)? COMMA? CCB { return members !== null ? members: {}; }
__KeyVal "key:val pair" = name:( String / __IdenChain ) COLON value:Value { return [name, value]; }
__IdenChain "key" = $(Iden (DOT Iden)*)


// ----- Array -----
Array = OSB values:ValueList? COMMA? CSB { return values ?? []; }
ValueList = head:Value tail:(COMMA Value)* { return mkArray(head, tail); }
// ----- None -----
Null "null" = "null" { return null; }
Undefined "undefined" = "undefined" { return undefined; }

// ----- Bool -----
// Bool "bool" = True / False
False = "false" { return false; }
True = "true" { return true; }

// ----- Number -----
Number "number"
	= neg:"-"? "0x" digits:$(HexDigit+) { return parseInt(`${neg ?? ''}${digits}`, 16); }
	/ neg:"-"? "0o" digits:$([0-7]+) { return parseInt(`${neg ?? ''}${digits}`, 8); }
	/ neg:"-"? "0b" digits:$([0-1]+) { return parseInt(`${neg ?? ''}${digits}`, 2); }
	/ "-"? Digit+ ("." Digit+)? ([eE] ("-" / "+")? Digit+)? { return parseFloat(text()); }

// ----- String -----
String "string"
	= '"' chars:(
		[^\0-\x1F\x5C\x22] // Printable except '\' and '"'
		/ __SpecialChar
	)* '"' { return chars.join(""); }
	/ "'" chars:(
		[^\0-\x1F\x5C\x27] // Printable except '\' and "'"
		/ __SpecialChar
	)* "'" { return chars.join(""); }
	/ '`' chars:(
		[^\0-\x1F\x5C\x60] // Printable except '\' and '`'
		/ __SpecialChar
	)* '`' { return chars.join(""); }
__SpecialChar
	= '\\\\' { return '\\'; }
	/ '\\"' { return '"'; }
	/ "\\'" { return "'"; }
	/ '\\`' { return '`'; }
	/ '\\b' { return '\b'; }
	/ '\\f' { return '\f'; }
	/ '\\n' { return '\n'; }
	/ '\\r' { return '\r'; }
	/ '\\t' { return '\t'; }
	/ "\\0" digits:$([0-7][0-7]?[0-7]?) { return String.fromCharCode(parseInt(digits, 8)); }
	/ "\\x" digits:$(HexDigit HexDigit?) { return String.fromCharCode(parseInt(digits, 16)); }
	/ "\\u" digits:$(HexDigit HexDigit HexDigit HexDigit)
		{ return String.fromCharCode(parseInt(digits, 16)); }
	/ [\x0A] // Allowed line-feed in string literal
	/ [\x09] // Allowed tab in string literal

// ----- Other -----
_ "whitespace" = ([ \t\n\r] / Comment)*
Comment "Comment"
	= '/*' (
		[^\x2A] // Not *
		/ '*'![\x2F] // '*' Neg-Look-Ahead for '/'
	)* '*/' //{ return text().slice(2, -2).trim(); }
	/ '//' [^\x0A]* [\x0A]? //{ return text().slice(2).trim(); }

// ----- -----
HexDigit "hex-char" = [0-9a-f]i
Digit "digit" = [0-9]
Iden "identifier" = $([_a-z$]i [0-9a-z$_]i*)

// ----- Symbols -----
DOT = "."
COMMA = _ "," _
COLON = _ ":" _

OSB = _ "[" _
CSB = _ "]" _

OCB = _ "{" _
CCB = _ "}" _

OB = _ "(" _
CB = _ ")" _