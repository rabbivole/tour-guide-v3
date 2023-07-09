/**
 * Name: Jason Langley
 * Date: 7-1-23
 *
 * Javascript stub file, with some helper/alias functions intended for web stuff.
 */

"use strict";
(function () {

  const REDIRECT_TIMEOUT = 3000;

  window.addEventListener("load", init);

  function init() {
    id("login").addEventListener("submit", function (evt) {
      evt.preventDefault();
      submitAuth(this);
    });
  }

  async function submitAuth(form) {
    const data = new FormData(form);
    try {
      let res = await fetch("/auth", { method: "POST", body: data });
      if (!res.ok) {
        console.error(res);
        throw new Error("bounce into catch");
      }
      onLogIn();
    } catch (err) {
      console.error(err);
      displayAlert(makeError("you blew it, kid"));
    }
  }

  function onLogIn() {
    displayAlert(makeAlert("your cookie, sire"));

    setTimeout(() => {
      window.location.replace("/create.html");
    }, REDIRECT_TIMEOUT);
  }

  function displayAlert(element) {
    qs("body").appendChild(element);
  }

  function makeAlert(text) {
    const alert = gen("p");
    alert.textContent = text;
    alert.classList.add("alert-good");
    return alert;
  }

  function makeError(text) {
    const err = gen("p");
    err.textContent = text;
    err.classList.add("alert-bad");
    return err;
  }

  /**
   * Helper function to return the response's result text if successful, otherwise
   * returns the rejected Promise result with an error status and corresponding text
   * [jsdoc taken from section exercise]
   * @param {object} res - response to check for success/error
   * @return {object} - valid response if response was successful, otherwise rejected
   *                    Promise result
   */
  async function statusCheck(res) {
    if (!res.ok) { // status is not in the ok range, we reject the promise
      throw new Error(await res.text());
    }
    return res;
  }

  /**
   * Alias for document.createElement().
   * @param {string} tag the HTML tag the desired element should be
   * @returns {Element} a freshly created HTML element
   */
  function gen(tag) {
    return document.createElement(tag);
  }

  /**
   * Alias for document.getElementById().
   * @param {string} id the id to retrieve an element for
   * @returns {Element} a DOM node with that id or null if it doesn't exist
   */
  function id(id) {
    return document.getElementById(id);
  }

  /**
   * Alias for document.querySelector().
   * @param {string} query the query to select for
   * @returns {Element} the first DOM node matching that query, or null if none exists
   */
  function qs(query) {
    return document.querySelector(query);
  }

  /**
   * Alias for document.querySelectorAll().
   * @param {string} query the query to select for
   * @returns {Element[]} a list of DOM nodes matching that query; [] if none exist
   */
  function qsa(query) {
    return document.querySelectorAll(query);
  }
})();
