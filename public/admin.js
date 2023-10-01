$(document).ready(function () {

  $("#buttons span").hover(function () {
    // hoverIn
    $(this).toggleClass("hovered");
    $(this).animate({ "padding-left": "10px" }, 200);
  },
    function () {
      // hoverOut
      $(this).toggleClass("hovered");
      $(this).animate({ "padding-left": "0" }, 200);
    });

  // prevent default drag behavior for media dropzone
  //let dropzone = $("#media-zone");
  let dropzone = document.getElementById("media-zone");
  $("#media-zone").on("dragenter dragleave dragover drop", function (evt) {
    evt.preventDefault();
    evt.stopPropagation();
    console.log("in preventing default");
    console.log(evt);
  });

  // highlighting control
  $("#media-zone").on("dragenter dragleave", function () {
    $(this).toggleClass("drag-highlight");
  });
  $("#media-zone").on("drop", function (evt) {
    $(this).removeClass("drag-highlight");
    console.log("in second drop");
    console.log(evt);
    handleDrop(evt);
  });

  function handleDrop(evt) {
    console.log(evt);
    $("#media-zone").empty();
    // jquery solution requires an .originalEvent here (???)
    let dt = evt.originalEvent.dataTransfer;
    console.log(dt.files[0]);
    let files = dt.files;
    ([...files]).forEach(previewFile);
  }

  function previewFile(file) {
    let reader = new FileReader();
    console.log(file);
    // for some reason this doesn't work with equivalent jquery. no idea why
    reader.onloadend = function (evt) {
      // let img = $("<img>");
      // img.src = reader.result;
      // console.log(img);
      // $("media-zone").append(img);
      let img = document.createElement("img");
      img.src = reader.result;
      console.log(img);
      document.getElementById("media-zone").appendChild(img);
    }
    reader.readAsDataURL(file);
  }

});