const blurbOptions = [
  "stopped at: ",
  "stopped in: ",
  "broke down at: ",
  "broke down in: ",
  "pulled over at: ",
  "pulled over in: ",
  "layover in: ",
  "layover at: ",
  "driving through: ",
  "passing through: ",
  "vacationing in: ",
  "touring: ",
  "today's stop: ",
  "exploring: ",
  "got lost in: ",
  "visiting: ",
  "arrived at: ",
  "arrived in: "
]

module.exports = {
  generateBlurb: function () {
    return blurbOptions[Math.floor(Math.random() * blurbOptions.length)];
  }
}