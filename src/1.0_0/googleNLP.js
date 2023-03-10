function getAPIKEY(refresh)
{
	var key;
	var key_req = new XMLHttpRequest();
	key_req.onreadystatechange = function(){
		if(this.status == 200 && this.readyState == this.DONE)
			key = key_req.responseText;
	}
	if(refresh) //토큰 갱신 요청
		key_req.open("GET","http://107.172.250.177/apikey?refresh=True",false);
	else //서버에 저장된 토큰 값만 받아옴
		key_req.open("GET","http://107.172.250.177/apikey?refresh=False",false);
	key_req.send();
	return key;
}
function getGoogleNLP(input,elem,key = "")
{
	var ret = {};
	input = input.replace(/'/gi, "\\'");
	var jq_message = "{\'document\':{\'type\':\'PLAIN_TEXT\' , \'content\':'" + input + "'}}";
	var API_KEY = key;
	if(key == "") // 미리 입력된 API KEY가 없다면, getAPIKEY로 키 가져옴
		API_KEY = getAPIKEY(false);
	$.ajax({
		beforeSend: function(xhr){
			xhr.setRequestHeader("Authorization","Bearer " + API_KEY);
			xhr.setRequestHeader("Content-Type","application/json; charset=utf-8");
		},
		url: "https://language.googleapis.com/v1/documents:classifyText",
		method: 'POST',
		data: jq_message,
		async: false,
		success: function (data) {
			google_category = data.categories[0].name.split("/");
			elem.innerHTML = google_category[google_category.length - 1];
			ret["category"] = google_category[google_category.length - 1];
		},
	    error: function (jqXHR, exception) {
			switch(jqXHR.status){
				case 403:
					elem.innerHTML = "잘못된 토큰 형태";
					break;
				case 400:
					elem.innerHTML = "인풋 에러";
					break;
				case 401:
					elem.innerHTML = "토큰 만료";
					//만약 토큰 만료가 되었으면, 토큰갱신을 요청한 후 딱 한번 더 GOOGLE에 쿼리 보내봄(재귀)
					if(key == "")
						ret["category"] = getGoogleNLP(input,elem,getAPIKEY(true));
					else //갱신된 토큰으로도 401이 뜨면 어쩔 수 없이 토큰 만료
						ret["category"] = "토큰 만료";
					break;
				default:
					elem.innerHTML = "알수없는 에러";
			}
		},
	});
	word_dict = count_word(input,elem);
	var tf_idf = get_tf_idf("aaa.txt",word_dict);
	ret["keyword"] = [];
	for(var k=0;k<30 && k<tf_idf.length;k++)
		ret["keyword"][k] = tf_idf[k][0];
	ret["language"] = findLanguage(word_dict);
	return ret;
}
function count_word(txt,elem)
{
	var word_dict = {};
	var words = txt.split(" ");
	for(word in words)
	{
		if(words[word] in word_dict)
		{
			word_dict[words[word]] ++;
		}
		else{
			word_dict[words[word]] = 1;
		}
	}
	return word_dict;
}
function get_tf_idf(file,word_dict)
{
	var tf_idf = [];
	var model = readTextFile(file,word_dict).split("\n");
	var m_dict = {};
	var m_size = model[0].replace(/[#]/gi,"")*1;
	for(var k=1;k<model.length;k++)
	{
		var tmp = model[k].split(":");
		m_dict[tmp[0]] = [tmp[1]*1,tmp[2]*1];
	}
	var cnt = 0;
	for(var key in word_dict)
	{
		var tmp;
		if(key == "")
			continue;
		if(key in m_dict)
		{
			tmp = word_dict[key] * Math.log((m_size + 1) / (m_dict[key][1] + 1));
		}
		else
		{
			tmp = word_dict[key] * Math.log((m_size + 1) / 10);
		}
		tf_idf[cnt] = [key,tmp];
		cnt++;
	}
	tf_idf.sort(function(a,b){
		return b[1] - a[1];
	});
	return tf_idf;
}
function findLanguage(word_dict) {
	var java = ["java","import","println"];
	var python = ["python","pip","py","import"];
	var javascript = ["javascript","html","css","js"];
	var tmp = [];
	var val = 0;
	for(word in java) {
		if(word in word_dict)
			val += word_dict[word];
	}
	tmp[0] = val;
	val = 0;
	for(word in python) {
		if(word in word_dict)
			val += word_dict[word];
	}
	tmp[1] = val;
	val = 0;
	for(word in javascript) {
		if(word in word_dict)
			val += word_dict[word];
	}
	tmp[2] = val;
	if(python >= java && python >= javascript)
		return "python";
	if(java > javascript)
		return "java";
	return "javascript";
}
function readTextFile(file,word_dict) {
	var txt;
	var rawFile = new XMLHttpRequest();
	rawFile.open("GET", file, false);
	rawFile.onreadystatechange = function () {
      if(rawFile.readyState === 4)
      {
         if(rawFile.status === 200 || rawFile.status == 0)
         {
			txt = rawFile.responseText;
         }
      }
   };
   rawFile.send(null);
   return txt;
}