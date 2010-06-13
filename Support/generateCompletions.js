#!/usr/bin/env node

var sys = require('sys');
var fs = require('fs');

function Suggestion(options){
	if (!(this instanceof Suggestion)) return new Suggestion(options);
	
	if (options) for (var property in options){
		if (!hasOwnProperty.call(options, property)) continue;
		if (typeof options[property] === 'undefined') continue;
		this[property] = options[property];
	}
	
	this.insert = (new Snippet()).appendRaw(this.insert);
}
Suggestion.prototype = {
	tool_tip_format : "html",
	tool_tip        : "",
	insert          : "$0", // new Snippet()
	match           : "suggestion",
	display         : "My suggestion of Doom!",
	image           : "",
	
	toJSON: function(){
		return {
			tool_tip_format : "" + this.tool_tip_format ,
			tool_tip        : "" + this.tool_tip        ,
			insert          : "" + this.insert          ,
			match           : "" + this.match           ,
			display         : "" + this.display         ,
			image           : "" + this.image           
		};
	}
};


Suggestion.Method = function(options){
	if (!(this instanceof Suggestion.Method)) return new Suggestion.Method(options);
	Suggestion.call(this, options);
	this.params = [];
};
Suggestion.Method.prototype = Object.create(Suggestion.prototype);
Suggestion.Method.prototype.image = "Method";
Suggestion.Method.prototype.insert = "($0)";
Suggestion.Method.prototype.updateToolTip = function(){
	tip = '';
	
	tip += this.description.replace(/^\s*(<p>)?/,'<p>');

	tip += '<p><code class="usage">';
	tip += '<b><u>';
	tip += this.display.replace(/\t/g,'').replace(/\:|$/,'</u></b><i>:');
	tip += "</i><br>(\n";
	
	var objectKey;
	var objectProperties;
	
	if (this.params && this.params.length)
	for (var i = -1, param; param = this.params[++i];){
		
		if (param.description) if (objectKey = param.description.match(/properties defined in .*?>([^<]*)</)){
			objectKey = objectKey[1];
			objectProperties = API[objectKey].properties;
			// sys.p(objectKey, objectProperties);
			
			tip += "{\n"
			for (var p = -1; p < objectProperties.length; ++p){
				if (!objectProperties[p]) continue;
				tip += describeProperty(objectProperties[p]);
			}
			tip += "}\n"
			continue;
		}
		
		tip	+= "\t";
		tip += describeProperty(param);
	}
	tip += ")\n"
	tip += '</code>'
	
	sys.print(tip.replace(/</g,'&lt;'));
	
	this.tool_tip = tip;
};

function describeProperty(p){
	var html	=	"\t"
		+	"<span>"
			+	"<b>"
				+	p.name
			+	"</b>"
			+	"<i>"
				+	":"
				+	p.type
			+	"</i>"
		+	"</span>"
		+	"\n\t\t"
		+	"<span class='info'>"
			+	(p.description || p.value).replace(/<[^>]*>/,'')
		+	"</span>"
		+	"\n"
	;
	return html;
}


Suggestion.Method.prototype.updateInsertSnippet = function(){
	snip = new Snippet('');
	var add;
	if (this.params && this.params.length){
		for (var i = -1, param; param = this.params[++i];){
			if (i == 0) snip.appendText("(").begin();
			else snip.appendText(", ");
			
			var isLast = !this.params[i+1];
			add = (isLast ? 'addLast' : 'addPlaceholder');
			
			switch (param.type){
			case 'string': snip.appendText("'")[add](param.name).appendText("'"); break;
			case 'object': snip.appendText("{")[add]().appendText("}"); break;
			case 'function': snip.appendText("function ").addPlaceholder(param.name).appendText("(").addPlaceholder().appendText(")").appendText("{")[add]().appendText("}"); break;
			default:
				snip.addPlaceholder(param.name);
			}
		}
		snip.end().appendText(')');
	}
	else snip.appendRaw('($0)');
	
	// sys.p(snip)
	
	this.insert = snip;
};
Suggestion.Method.prototype.addParams = function(params){
	if (!(params && params.length)) return this;
	for (var i = -1, param; param = params[++i];){
		this.addParam(param, false);
	}
	this.updateToolTip();
	this.updateInsertSnippet();
	return this;
};
Suggestion.Method.prototype.addParam = function(param, shouldUpdate){
	this.params.push(param);
	if (shouldUpdate !== false) this.updateToolTip().updateInsertSnippet();
	return this;
};


Suggestion.Property = function(string){
	if (!(this instanceof Suggestion.Property)) return new Suggestion.Property(string);
	Suggestion.call(this, options);
};
Suggestion.Property.prototype = Object.create(Suggestion.prototype);
Suggestion.Property.prototype.image = "Property";


function Snippet(string){
	if (!(this instanceof Snippet)) return new Snippet(string);
	
	this.snippet = '';
	this.appendText(string || '');
	this.placeholderID = 0;
}
Snippet.prototype = {
	
	appendRaw: function(string){
		this.snippet += string;
		return this;
	},
	
	appendText: function(string){
		this.snippet += Snippet[this.insidePlaceholder ? 'escapePlaceholderValue' : 'escape'](string);
		return this;
	},
	
	addPlaceholder: function(value, escape){
		this.appendPlaceholder(++ this.placeholderID, value, escape);
		return this;
	},
	
	addLast: function(value, escape){
		this.appendPlaceholder(0, value, escape);
		return this;
	},
	
	appendPlaceholder: function(key, value, escape){
		if (typeof escape === 'undefined') escape = true;
		if (!value) value = '';
		if (escape) value = Snippet.escapePlaceholderValue(value);
		this.snippet += "${"+ key +":"+ value +"}";
		return this;
	},
	
	begin: function(key){
		if (key == null) key = ++ this.placeholderID;
		this.snippet += "${"+ key +":";
		this.insidePlaceholder = true;
		return this;
	},
	
	end: function(){
		this.snippet += "}";
		this.insidePlaceholder = false;
		return this;
	},
	
	toString: function(){
		return this.snippet;
	},
	
	toJSON: function(){
		return this.toString();
	}
	
};
Snippet.escape = function(string){
	return (''+string).replace(/(?=[$`\\])/,'\\');
}
Snippet.escapePlaceholderValue = function(string){
	return (''+string).replace(/(?=[$`\\}])/,'\\');
}

Suggestion.fromAPI = function(api, namespace){
	
	completions.suggestions.push(
		new Suggestion({
			tool_tip        : api.description +'<hr />'+ (api.notes || ''),
			match           : namespace,
			display         : namespace,
			image           : "Namespace"
		})
		.toJSON()
	);
	
	if (api.methods && api.methods.length)
	api.methods.forEach(function(method){
		// sys.p(method.name, method.returntype, method.parameters.map(function(param){ return param.name+':'+param.type }));
		completions.suggestions.push(
			new Suggestion.Method({
				match   : namespace +'.'+ method.name,
				display : namespace +'.'+ method.name + '\t:' + method.returntype,
				description: method.value
			})
			.addParams(method.parameters)
			.toJSON()
		);
	});
	
	// if (api.properties && api.properties.length)
	// api.properties.forEach(function(property){
	// 	completions.suggestions.push(
	// 		new Suggestion.Property({
	// 			tool_tip : property.value,
	// 			
	// 			match    : property.name,
	// 			display  : property.name + ':' + property.type
	// 		})
	// 		.toJSON()
	// 	);
	// });
	
};


// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

sys.p(process.env.TM_DIRECTORY + '/api.json');

var API, completions = {
	extra_chars: "\._$",
	images: {
		Namespace:'Namespace.png',
		Method:'Method.png',
		Property:'Property.png'
	},
	tool_tip_prefix:[
		
		"<style>"
			,'body {background: transparent;}'
			,'html,body,table{font-size:10px; font-family: "Lucida Grande", "Trebuchet MS", Verdana, sans-serif;}'
			
			,'#root {\
				background-color: #eef; \
				background: -webkit-gradient(linear, left top, left bottom, from(#EEE), to(#DDD));\
				-webkit-border-radius: 1ex; \
				padding: 1ex 3ex; \
				-webkit-transition: all 0.75s ease-out;\
				color: rgba(0,0,0,0.25);\
			}'
			
			,'#root code span { display:block;padding-left:4ex; }'
			,'#root code span.info { padding-left:6ex; font-size: 83.3333% }'
			
			,'code{font-family:inherit}'
			,'code b{ \
				color: #000; \
				font-weight:normal; \
				font-family: "Luxi Mono", Consolas, Monaco, monospace; \
				text-shadow: #fff 0 1px 2px; \
			}'
			
			,'* {font-size: 100%}'
			,'body {font-size: 12px}'
			,'#root > p:first-of-type {margin-top:0}'
			// ,'pre { font-family: Inconsolata, Consolas, Monaco, monospace}'
		,"</style>"
		,"<script> window.addEventListener('load',function(){"
			,"s = document.getElementById('root').style;"
				,"s.color = 'rgba(64,64,64,1)';"
		,"},false); <\/script>"
		,"<div id='root'>"
		
	].join(''),
	suggestions:[]
};

fs.readFile(process.env.TM_DIRECTORY + '/api.json', function(err, api_json){
	
	API = JSON.parse(api_json);
	
	for (var namespace in API){
		if (!hasOwnProperty.call(API, namespace)) continue;
		Suggestion.fromAPI(API[namespace], namespace);
		Suggestion.fromAPI(API[namespace], namespace.replace(/^Titanium/,'Ti'));
	}
	
	// sys.p(completions);
	
	fs.writeFileSync(process.env.TM_DIRECTORY + '/completions.json', JSON.stringify(completions))
	
});


// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

var hasOwnProperty = {}.hasOwnProperty;


// -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
// -- tlrobinson Tom Robinson
// dantman Daniel Friesen

/*!
    Copyright (c) 2009, 280 North Inc. http://280north.com/
    MIT License. http://github.com/280north/narwhal/blob/master/README.md
*/

// Brings an environment as close to ECMAScript 5 compliance
// as is possible with the facilities of erstwhile engines.

// ES5 Draft
// http://www.ecma-international.org/publications/files/drafts/tc39-2009-050.pdf

// NOTE: this is a draft, and as such, the URL is subject to change.  If the
// link is broken, check in the parent directory for the latest TC39 PDF.
// http://www.ecma-international.org/publications/files/drafts/

// Previous ES5 Draft
// http://www.ecma-international.org/publications/files/drafts/tc39-2009-025.pdf
// This is a broken link to the previous draft of ES5 on which most of the
// numbered specification references and quotes herein were taken.  Updating
// these references and quotes to reflect the new document would be a welcome
// volunteer project.


// ES5 15.2.3.5 
if (!Object.create) {
    Object.create = function(prototype, properties) {
        if (typeof prototype != "object" || prototype === null)
            throw new TypeError("typeof prototype["+(typeof prototype)+"] != 'object'");
        function Type() {};
        Type.prototype = prototype;
        var object = new Type();
        if (typeof properties !== "undefined")
            Object.defineProperties(object, properties);
        return object;
    };
}

