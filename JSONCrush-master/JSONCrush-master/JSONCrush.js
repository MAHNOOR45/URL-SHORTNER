
'use strict';

export default
{

crush: (string, maxSubstringLength=50)=>
{
    const delimiter = '\u0001'; 
    const JSCrush=(string, replaceCharacters)=>
    {

        let replaceCharacterPos = replaceCharacters.length;
        let splitString = '';
        
        const ByteLength =(string)=>encodeURI(encodeURIComponent(string)).replace(/%../g,'i').length;
        const HasUnmatchedSurrogate =(string)=>
        {
            
            let c1 = string.charCodeAt(0);
            let c2 = string.charCodeAt(string.length-1);
            return (c1 >= 0xDC00 && c1 <= 0xDFFF) || (c2 >= 0xD800 && c2 <= 0xDBFF);
        }
        
        
        let substringCount = {};
        for (let substringLength = 2; substringLength < maxSubstringLength; substringLength++)
        for (let i = 0; i < string.length - substringLength; ++i)
        {
            let substring = string.substr(i, substringLength);

            
            if (substringCount[substring])
                continue;

            
            if (HasUnmatchedSurrogate(substring))
                continue;

            
            let count = 1;
            for (let substringPos = string.indexOf(substring, i+substringLength); substringPos >= 0; ++count)
                substringPos = string.indexOf(substring, substringPos + substringLength);
                
            
            if (count > 1)
                substringCount[substring] = count;
        }
        
        while(true) 
        {
            
            for (;replaceCharacterPos-- && string.includes(replaceCharacters[replaceCharacterPos]);){}
            if (replaceCharacterPos < 0)
                break; 
            let replaceCharacter = replaceCharacters[replaceCharacterPos];
            
            
            let bestSubstring;  
            let bestLengthDelta = 0;  
            let replaceByteLength = ByteLength(replaceCharacter);
            for (let substring in substringCount) 
            {
              
                let count = substringCount[substring];
                let lengthDelta = (count-1)*ByteLength(substring) - (count+1)*replaceByteLength;
                if (!splitString.length)
                    lengthDelta -= ByteLength(delimiter); 
                if (lengthDelta <= 0)
                    delete substringCount[substring]
                else if (lengthDelta > bestLengthDelta)
                {
                    bestSubstring = substring
                    bestLengthDelta = lengthDelta;
                }
            }
            if (!bestSubstring)
                break; 
                
            
            string = string.split(bestSubstring).join(replaceCharacter) + replaceCharacter + bestSubstring;
            splitString = replaceCharacter + splitString;
            
            
            let newSubstringCount = {};
            for (let substring in substringCount)
            {
                
                let newSubstring = substring.split(bestSubstring).join(replaceCharacter);
                
                
                let count = 0;
                for (let i = string.indexOf(newSubstring); i >= 0; ++count)
                    i = string.indexOf(newSubstring, i + newSubstring.length);
                    
                
                if (count > 1)
                    newSubstringCount[newSubstring] = count;
                
            }
            substringCount = newSubstringCount;
        }

        return {a:string, b:splitString};
    }
    

    let characters = [];
    
    
    const unescapedCharacters = `-_.!~*'()`;
    for (let i=127; --i;)
    {
        if 
        (
            (i>=48 && i<=57) ||
            (i>=65 && i<=90) || 
            (i>=97 && i<=122)|| 
            unescapedCharacters.includes(String.fromCharCode(i))
        )
            characters.push(String.fromCharCode(i));
    }
    
    
    for (let i=32; i<255; ++i)
    {
        let c = String.fromCharCode(i);
        if (c!='\\' && !characters.includes(c))
            characters.unshift(c);
    }

    
    string = string.replace(new RegExp(delimiter,'g'),'');
    

    string = JSONCrushSwap(string);
    
    
    const crushed = JSCrush(string, characters);
    
    
    let crushedString = crushed.a;
    if (crushed.b.length)
        crushedString += delimiter + crushed.b;
    
    
    crushedString += '_';
    
    return crushedString;
},

uncrush: (string)=>
{
    // remove last character
    string = string.substring(0, string.length - 1);

    // unsplit the string using the delimiter
    const stringParts = string.split('\u0001');
    
    // JSUncrush algorithm
    let uncrushedString = stringParts[0];
    if (stringParts.length > 1)
    {
        let splitString = stringParts[1];
        for (let character of splitString)
        {
            // split the string using the current splitCharacter
            let splitArray = uncrushedString.split(character);

            // rejoin the string with the last element from the split
            uncrushedString = splitArray.join(splitArray.pop());
        }
    }
    
    // unswap the json characters in reverse direction
    return JSONCrushSwap(uncrushedString, 0);
}

} // JSONCrush

const JSONCrushSwap = (string, forward=1)=>
{
    // swap out characters for lesser used ones that wont get escaped
    const swapGroups = 
    [
        ['"', "'"],
        ["':", "!"],
        [",'", "~"],
        ['}', ")", '\\', '\\'],
        ['{', "(", '\\', '\\'],
    ];
    
    const swapInternal=(string, g)=>
    {
        let regex = new RegExp(`${(g[2]?g[2]:'')+g[0]}|${(g[3]?g[3]:'')+g[1]}`,'g');
        return string.replace(regex, $1 => ($1 === g[0] ? g[1] : g[0]));
    }

    // need to be able to swap characters in reverse direction for uncrush
    if (forward)
        for (let i = 0; i < swapGroups.length; ++i)
            string = swapInternal(string, swapGroups[i]);
    else
        for (let i = swapGroups.length; i--;)
            string = swapInternal(string, swapGroups[i]);

    return string;
}