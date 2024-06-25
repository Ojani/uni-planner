"use strict"

import searchCourses from './lib/courseSearch.js'

// Adding the options for selecting the year in the course search form
(async () => {
    const yearSelectorElement = document.querySelector(".courseSearchYear")
    const currentYear = new Date().getFullYear()
    const startYear = 2005

    for(let year = currentYear; year >= startYear; year -=1) {
        const optionElement = document.createElement("option");
        optionElement.text = optionElement.value = year

        yearSelectorElement.appendChild(optionElement)
    }

    // setting the default selected year to be last year because
    // all courses for this year may not be available yet.
    yearSelectorElement.value = currentYear-1
})();


// SEARCHING FOR COURSES
const searchCourseBtn = document.querySelector(".searchCourse");

// Clicking on search button
searchCourseBtn.addEventListener("click", () => {
    // adding loading indicator
    document.querySelector(".courseSearchResultsList").innerText = "loading..."

    // getting inputs
    const courseSearchProfessor = document.querySelector(".courseSearchProfessor").value;
    const courseSearchCode = document.querySelector(".courseSearchCode").value;
    const courseSearchTerm = document.querySelector(".courseSearchTerm").value;
    const courseSearchYear = document.querySelector(".courseSearchYear").value;

    searchForCourses({
        PROFESSOR: courseSearchProfessor,
        COURSE_CODE: courseSearchCode, 
        TERM: courseSearchTerm,
        YEAR: courseSearchYear
     })
})

async function searchForCourses({ COURSE_CODE, TERM }) {
    document.querySelector(".courseSearchResultsBackdrop").classList.remove("hidden");
    const results = await searchCourses({ COURSE_CODE, TERM })

    const resultListElement = document.querySelector(".courseSearchResultsList");
    resultListElement.innerHTML = ""

    // creating elements to put results on the list
    var i = 0
    for(let key in results) {
        i++
        const { courseCode, name, credits } = results[key]

        const resultListItem = document.createElement("label");
        resultListItem.className = "courseSearchResultsListItem"
        resultListItem.innerHTML = 
        `
            <div><span class="searchListCode">${courseCode}</span>    <span class="searchListCredits">${credits}</span>    <span class="searchListName">${name}</span></div>
            <div><input type="checkbox" id="courseSearchCheckbox${i}"></div>
        `

        resultListElement.setAttribute("for", "courseSearchCheckbox"+i)
        resultListElement.appendChild(resultListItem)
    }

    if(Object.keys(results).length == 0) resultListElement.innerHTML = "No courses were found..."
}

// Clicking off course search results
const courseSearchResultsBackdrop = document.querySelector(".courseSearchResultsBackdrop")

courseSearchResultsBackdrop.addEventListener("click" , (e) => {
    e.target.classList.add("hidden")
    e.stopPropagation()
});

document.querySelector(".exitCourseSearchResultsBtn").addEventListener("click", () => {
    courseSearchResultsBackdrop.classList.add("hidden")
});

// Adding selected courses
const addCoursesBtn = document.querySelector(".addCourses");
addCoursesBtn.addEventListener("click", () => {
    const selected = Array.from(document.querySelectorAll(".courseSearchResultsListItem input:checked"));

    for(let elem of selected) {
        const parent = elem.parentElement.parentElement

        const credits = parent.querySelector(".searchListCredits").innerText
        const code = parent.querySelector(".searchListCode").innerText
        const name = parent.querySelector(".searchListName").innerText

        addCourse([code, credits, name])
        courseSearchResultsBackdrop.classList.add("hidden")
    }
})


class Course {
    constructor ({ courseCode, name, credits, taken=false }) {
        this.courseCode = courseCode
        
        this.credits = credits
        this.taken = taken
        this.name = name
    }
}

var courses = {}
var semesters = [[],[],[],[],[],[],[],[]]
const takenCourses = new Set()


// Storage stuff

function updateSemestersStorage() {
    localStorage.setItem("semesters", JSON.stringify(semesters))
}

function updateCoursesStorage() {
    localStorage.setItem("courses", JSON.stringify(courses))
}

function getSemestersFromStorage() {
    const result = JSON.parse(localStorage.getItem("semesters")) || [[],[],[],[],[],[],[],[]]
    updateSemesters(result)
    semesters = result
}

function getCoursesFromStorage() {
    const result = JSON.parse(localStorage.getItem("courses")) || {}
    updateCourses(result)
    courses = result
}


getCoursesFromStorage()
getSemestersFromStorage()


document.querySelector(".addSemester").addEventListener("click", () => addSemester());
function addSemester() {
    semesters.push([])
    updateSemesters()
}

function updateSemesters() {

    const wrapper = document.querySelector(".availableSemesters")
    
    wrapper.innerHTML = ""

    // When a course is added to a semester it is added here after adding the semester markup.
    // This is where we check for reqs.
    // When checking for coreq, we check here in case we already took them, otherwise we check
    // in the current list of courses being added to see if it's there since coreqs
    // can be taken at the same time as the class that required it
    const coursesTaken = new Set()

    for(let i = 0; i < semesters.length; i++) {
        const year = Math.floor(i / 2) + 1
        const semester = i % 2 + 1

        const markup = 
        `
        <h2>Year ${year} Semester ${semester}</h2>
        <div class="coursesInSemester"></div>
        <div class="totalCredits">Total Credits: <span class="credits"></span></div>
        <div class="removeSemester redbtn">Remove Semester</div>
        `

        // Creating the element for the course, filling it with it's html and adding it's event listeners
        // for drag and drop
        const semesterElement = document.createElement("div")
        semesterElement.className = "semester semester"+i
       
        semesterElement.innerHTML = markup
        
        semesterElement.addEventListener("dragover", allowCourseDrop)
        semesterElement.addEventListener("drop", e => droppingCourse(e, i))
        semesterElement.querySelector(".removeSemester")
        .addEventListener("click", () => removeSemester(i))

        wrapper.appendChild(semesterElement)

        if(semester % 2 == 0) {
            const addSummerBtnElement = document.createElement("div");
            addSummerBtnElement.className = "addSummerBtn"
            addSummerBtnElement.innerText = "Add Summer"
            wrapper.appendChild(addSummerBtnElement)
        }

        var totalCredits = 0

        for(let courseCode of semesters[i]) {
            const course = courses[courseCode]
            takenCourses.add(courseCode)

            totalCredits += Number(course.credits)

            const courseMarkup = 
            `
            <div class="courseCode">${courseCode}</div>
            <div class="courseName">${course.name}</div>
            <div class="courseCredits">${course.credits}</div>
            <div class="removeCourseFromSemester">Remove</div>
            `

            const courseElement = document.createElement("div")
            courseElement.className = "courseWrapper"
            courseElement.draggable = "true"
            courseElement.id = courseCode
            
            courseElement.innerHTML = courseMarkup
            
            courseElement.addEventListener("dragstart", e => draggingCourse(e, i))
            courseElement.addEventListener("dragend", e => droppedCourseFromAnother(e, i))
            courseElement.querySelector(".removeCourseFromSemester")
            .addEventListener("click", () => removeCourseFromSemester(i, courseCode))

            semesterElement.querySelector(".coursesInSemester").appendChild(courseElement);
        }

        semesterElement.querySelector(".credits").innerHTML = totalCredits

        // Adding text to tell user to drag and drop semesters if there are no classes in it
        if(semesters[i].length == 0) {
            semesterElement.querySelector(".coursesInSemester").innerHTML = 
            `
            <div class="coursesPlaceHolder">
                <p>Drag and drop courses into the semseter to add them</p>
            </div>
            `
        }
    }

    updateSemestersStorage()
    updateCourses(courses)
}

function addCourseToSemester(semesterIndex, courseCode) {
    if(takenCourses.has(courseCode)) return
    semesters[semesterIndex].push(courseCode)
    updateSemesters()
}

function removeSemester(semesterIndex) {
    for(courseCode of semesters[semesterIndex]) {
       takenCourses.delete(courseCode)
    }
    semesters.splice(semesterIndex, 1)
    updateSemesters()
}

function removeCourseFromSemester(semesterIndex, courseCode) {
    semesters[semesterIndex] = semesters[semesterIndex].filter(code => code != courseCode)
    takenCourses.delete(courseCode)
    updateSemesters()
}


updateSemesters()


// Creating Courses and Semesters

document.querySelector(".addCourse").addEventListener("click", () => addCourse());

function addCourse(inputs) {

    if(inputs) {
        var [ courseCode, credits, name ] = inputs
    }
    else {
        var courseCode = document.querySelector(".newCourseCode").value;
        var name = document.querySelector(".newCourseName").value;
        var credits = document.querySelector(".newCourseCredits").value;
    }

    document.querySelectorAll(".courseFormSection input").forEach(e => e.value = "");
    const newCourse = new Course({ courseCode, name, credits })

    courses[courseCode] = newCourse
    updateCoursesStorage()
    updateCourses(courses)
}

function removeCourseFromList(courseCode) {
    if(takenCourses.has(courseCode)) return

    delete courses[courseCode]
    updateCoursesStorage()
    updateCourses(courses)
}


function updateCourses(courses) {
    const wrapper = document.querySelector(".availableCourses");

    wrapper.innerHTML = ""

    var totalCoursesAmt = 0
    var totalCreditsAmt = 0
    var coursesNotTakenAmt = 0
    var creditsNotTakenAmt = 0

    // first adding courses that aren't already in use and then adding the ones in use at the end
    const orderedCourses = Object.keys(courses).filter(courseCode => {
        // counting total and taken courses and credits
        totalCoursesAmt += 1
        totalCreditsAmt += Number(courses[courseCode].credits)

        if(!takenCourses.has(courseCode)) {
            coursesNotTakenAmt += 1
            creditsNotTakenAmt += Number(courses[courseCode].credits)
            return true
        }

    }).
    concat(Object.keys(courses).filter(courseCode => takenCourses.has(courseCode) ))

    for(let courseCode of orderedCourses) {
        const { discipline, number, name, credits, taken } = courses[courseCode]

        console.log("Updating courses")

        const markup = 
        `
        <div class="courseCode">${courseCode}</div>
        <div class="courseName">${name}</div>
        <div class="courseCredits">${credits}</div>
        <div class="removeCourseFromList">Remove</div>
        `

        // <div draggable="true" class="courseWrapper ${takenCourses.has(courseCode)? "crossed" : ""}">
        const courseElement = document.createElement("div");
        courseElement.className = `courseWrapper ${takenCourses.has(courseCode)? "crossed" : ""}`
        courseElement.draggable = "true"
        courseElement.id = courseCode
        courseElement.innerHTML = markup

        courseElement.addEventListener("dragstart", draggingCourse)
        courseElement.querySelector(".removeCourseFromList")
        .addEventListener("click", () => removeCourseFromList(courseCode))

        wrapper.appendChild(courseElement)
    }

    document.querySelector(".totalCoursesAmount").innerText = totalCoursesAmt
    document.querySelector(".takenCoursesAmount").innerText = totalCoursesAmt - coursesNotTakenAmt
    document.querySelector(".totalCreditsAmount").innerText = totalCreditsAmt
    document.querySelector(".takenCreditsAmount").innerText = totalCreditsAmt - creditsNotTakenAmt
}

// Loading courses from JSON file
// format is a list of semesters, each semester a list which contains the course code, credits, and name.
// example: [['INSO 4151', '3', 'Software Engineering Project I']]

// detecting when a file has been uploaded
const fileUploadBtn = document.querySelector("#loadCoursesFileBtn")
fileUploadBtn.onchange = () => {
    if(fileUploadBtn.files.length == 0) return

    const reader = new FileReader()
    reader.onload = (e) => {
        const semesters = JSON.parse(e.target.result)
        
        for(semester of semesters) {
            for(course of semester) {
                addCourse(course)
            }
        }
    }

    reader.readAsText(fileUploadBtn.files[0]);
}

//  Setting funtionality to add a course to a semester via drag and drop
function draggingCourse(ev, draggedFromSemesterIndex=-1) {
    ev.dataTransfer.clearData()
    
    const courseCode = ev.target.id
    
    // This allowing the course to be dragged from one semester to another
    // while preventing having the same course being dragged on more than one 
    // semester from the course list
    if(draggedFromSemesterIndex != -1) {
        takenCourses.delete(courseCode)
        // preventing course from being dropped in the semester it was take out of
        document.querySelector(".semester"+draggedFromSemesterIndex).classList.add("disabled");
    }
    ev.dataTransfer.setData("text/plain", courseCode)
}

function droppingCourse(ev, semesterIndex) {
    ev.preventDefault()
    ev.stopPropagation()

    const courseCode = ev.dataTransfer.getData("text/plain")
    addCourseToSemester(semesterIndex, courseCode)
}

function droppedCourseFromAnother(ev, semesterIndex) {
    const courseCode = ev.dataTransfer.getData("text/plain")

    document.querySelector(".semester"+semesterIndex).classList.remove("disabled");

    // only removing course from the semester if it got dropped on another one
    if(takenCourses.has(courseCode)) {
        removeCourseFromSemester(semesterIndex, courseCode)
    } 
    // otherwise, adding it back into the taken courses set because it remained in this semester 
    // and wont be readded into the set automatically since it wasn't dropped on another semester
    else{
        takenCourses.add(courseCode)
    }
}

function allowCourseDrop(ev) {
    ev.preventDefault()
}