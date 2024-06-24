"use strict"

// Searches for course sections using the course code and (optionally) the professor

export default async function searchSections({ COURSE_CODE, PROFESSOR = "", TERM, YEAR }) {
    // Defaulting year to the current one
    if(!YEAR) YEAR = new Date().getFullYear()

    const searchQuery = `https://www.uprm.edu/registrar/sections/index.php?v1=${encodeURI(COURSE_CODE)}&op2=1&v2=${encodeURI(PROFESSOR)}&term=${encodeURI(TERM)}-${encodeURI(YEAR)}&a=s&cmd1=Search`

    // This is dependent on the api.ojani.dev request forwarder
    const url = "https://api.ojani.dev/apis/http-request-forwarder/api/" + searchQuery

    // fetching data
    const request = await fetch(url)
    const text = await request.text()

    // adding the contents of the page into an html element so that query selectors can be used
    const parser = new DOMParser()
    const html = parser.parseFromString(text, 'text/html');

    const tableRows = Array.from(html.querySelectorAll("td:nth-child(2):not(.extrainfo)"))

    // object whose keys are the class codes and the values are the classes' names
    const courses = {}

    for(let content of tableRows) {
        // Getting the nodes containing the course code and name and extracting the text from them
        let [courseNameNode, , courseCodeAndSectionNode] = content.childNodes
        let courseCodeAndSection = courseCodeAndSectionNode.innerText
        let courseCode = courseCodeAndSection.slice(0, courseCodeAndSection.indexOf("-"))
        let courseName = courseNameNode.data
        
        // adding the course code to the object with the couse name as its value
        courses[courseCode] = courseName
    }

    return courses
}
