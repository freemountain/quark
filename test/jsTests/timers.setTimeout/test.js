setTimeout(process.send, 1, 1);
setTimeout(process.send, 2, 2);

var id = setTimeout(process.send, 3, 3);

clearTimeout(id);
process.send(0);
