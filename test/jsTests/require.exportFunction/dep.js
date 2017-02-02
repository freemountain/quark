var addOne = function addOne(x) {
  return x + 1;
};


addOne.addTwo = function addTwo(x) {
  return addOne(addOne(x));
}

module.exports = addOne;
