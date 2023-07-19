/**
 * Name: Jason Langley
 * Date: 7-1-23
 *
 * Javascript stub file, with some helper/alias functions intended for web stuff.
 */

"use strict";
(function () {

  window.addEventListener("load", init);

  function init() {
    id("the-form").addEventListener("submit", function (evt) {
      evt.preventDefault();
      submitForm(this);
    })
  }

  async function submitForm(form) {
    const data = new FormData(form);
    try {
      let res = await fetch("/add-post", { method: "POST", body: data });
      await res.json();
      console.log(res);
    } catch (err) {
      console.error(err);
    }

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
