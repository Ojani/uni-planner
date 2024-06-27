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
var summers = []
const takenCourses = new Set()


// Storage stuff

function updateSemestersStorage() {
    localStorage.setItem("semesters", JSON.stringify(semesters))
    localStorage.setItem("summers", JSON.stringify(summers))
}

function updateCoursesStorage() {
    localStorage.setItem("courses", JSON.stringify(courses))
}

function getSemestersFromStorage() {
    const semesterStorage = JSON.parse(localStorage.getItem("semesters")) || [[],[],[],[],[],[],[],[]]
    const summerStorage = JSON.parse(localStorage.getItem("summers")) || []
    semesters = semesterStorage
    summers = summerStorage
    
    updateSemesters()
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

function addSummer(summerIndex) {
    summers[summerIndex] = []
    updateSemesters()
}

function updateSemesters() {

    const wrapper = document.querySelector(".availableSemesters")
    
    wrapper.innerHTML = ""

    for(let i = 0; i < semesters.length; i++) {
        const year = Math.floor(i / 2) + 1
        const semester = i % 2 + 1
        const summerIndex = year-1

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
        semesterElement.addEventListener("drop", e => droppingCourseOnSemester(e, i))
        semesterElement.querySelector(".removeSemester")
        .addEventListener("click", () => removeSemester(i))

        wrapper.appendChild(semesterElement)

        // Adding summer section or button to add a summer section
        // after every winter semester
        if(semester % 2 == 0) {
            // adding summer section
            if(summers.length >= year && summers[summerIndex] != null) {
                const summerElement = document.createElement("div");
                summerElement.className = "semester summer summer"+year

                // Choosing the postfix for the summer number (1st, 2nd, 3rd, 4th, etc.)
                const postfixes = ['st', 'nd', 'rd']
                const postFix = year > postfixes.length? "th" : postfixes[summerIndex]

                summerElement.innerHTML += 
                `
                <h2>${year}${postFix} Summer</h2>
                <div class="coursesInSemester"></div>
                <div class="totalCredits">Total Credits: <span class="credits"></span></div>
                <div class="removeSummer btn">Remove Summer</div>
                `

                summerElement.addEventListener("dragover", allowCourseDrop)
                summerElement.addEventListener("drop", e => droppingCourseOnSummer(e, summerIndex))
                summerElement.querySelector(".removeSummer")
                .addEventListener("click", () => removeSummer(summerIndex))

                wrapper.appendChild(summerElement)

                var totalSummerCredits = 0
                // adding course list items
                for(let courseCode of summers[summerIndex]) {
                    // creating course list item and appending it to the list of courses for the semester
                    const course = courses[courseCode]
                    const courseListItemElement = createCourseListItemElement(course)
                    summerElement.querySelector(".coursesInSemester")
                    .appendChild(courseListItemElement);
                    
                    courseListItemElement.addEventListener("dragstart", e => draggingCourse(e, true))
                    courseListItemElement.addEventListener("dragend", e => droppedCourseFromSummer(e, summerIndex))
                    courseListItemElement.querySelector(".removeCourseFromSemester")
                    .addEventListener("click", () => removeCourseFromSummer(summerIndex, course.courseCode))
        
                    takenCourses.add(courseCode)
                    totalSummerCredits += Number(course.credits)
                }
                summerElement.querySelector(".credits").innerText = totalSummerCredits

                // Adding text to tell user to drag and drop into semesters/summers if there are no classes in it
                if(summers[summerIndex].length == 0) {
                    summerElement.querySelector(".coursesInSemester").innerHTML = 
                    `
                    <div class="coursesPlaceHolder">
                        <p>Drag and drop courses into the summer to add them</p>
                    </div>
                    `
                }
            }
            // adding button to add summer section
            else {
                const addSummerBtnElement = document.createElement("div");
                addSummerBtnElement.className = "addSummerBtn"
                addSummerBtnElement.innerHTML = "<div></div><p>Add Summer</p><div></div>"
                wrapper.appendChild(addSummerBtnElement)

                addSummerBtnElement.addEventListener("click", () => addSummer(summerIndex));
            }
        }

        var totalCredits = 0

        // adding course list items
        for(let courseCode of semesters[i]) {
            // creating course list item and appending it to the list of courses for the semester
            const course = courses[courseCode]
            const courseListItemElement = createCourseListItemElement(course)
            semesterElement.querySelector(".coursesInSemester")
            .appendChild(courseListItemElement);
            
            courseListItemElement.addEventListener("dragstart", e => draggingCourse(e, true))
            courseListItemElement.addEventListener("dragend", e => droppedCourseFromSemester(e, i))
            courseListItemElement.querySelector(".removeCourseFromSemester")
            .addEventListener("click", () => removeCourseFromSemester(i, course.courseCode))

            takenCourses.add(courseCode)
            totalCredits += Number(course.credits)
        }

        semesterElement.querySelector(".credits").innerText = totalCredits

        // Adding text to tell user to drag and drop into semesters/summers if there are no classes in it
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

// Creating the course list item for a semester or summer
function createCourseListItemElement(course) {
    const courseMarkup = 
    `
    <div class="courseCode">${course.courseCode}</div>
    <div class="courseName">${course.name}</div>
    <div class="courseCredits">${course.credits}</div>
    <div class="removeCourseFromSemester">Remove</div>
    `

    const courseElement = document.createElement("div")
    courseElement.className = "courseWrapper"
    courseElement.id = course.courseCode
    courseElement.draggable = "true"
    
    courseElement.innerHTML = courseMarkup

    return courseElement
}

// editing semesters
function addCourseToSemester(semesterIndex, courseCode) {
    if(takenCourses.has(courseCode)) return
    semesters[semesterIndex].push(courseCode)
    updateSemesters()
}

function removeSemester(semesterIndex) {
    for(let courseCode of semesters[semesterIndex]) {
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

// editing summers
function addCourseToSummer(summerIndex, courseCode) {
    if(takenCourses.has(courseCode)) return
    console.log(summerIndex)
    summers[summerIndex].push(courseCode)
    updateSemesters()
}

function removeSummer(summerIndex) {
    for(let courseCode of summers[summerIndex]) {
       takenCourses.delete(courseCode)
    }
    // removing summer section from the array
    summers[summerIndex] = null
    
    // truncating list of summers to remove trailing null summers
    while(summers.length > 0 && summers[summers.length-1] == null) {
        summers = summers.slice(0, summers.length-1)
    }
    
    updateSemesters()
}

function removeCourseFromSummer(summerIndex, courseCode) {
    summers[summerIndex] = summers[summerIndex].filter(code => code != courseCode)
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
        const { name, credits} = courses[courseCode]

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

//  Setting funtionality to add a course to a semester via drag and drop
function draggingCourse(ev, isDraggedFromSemester=false) {
    const courseCode = ev.target.id
    
    // This allows the course to be dragged from one semester to another
    if(isDraggedFromSemester) {
        takenCourses.delete(courseCode)
    }
    ev.dataTransfer.setData("text/plain", courseCode)
}

function droppingCourseOnSemester(ev, semesterIndex) {
    ev.preventDefault()
    ev.stopPropagation()

    const courseCode = ev.dataTransfer.getData("text/plain")
    
    // preventing errors when dragging and dropping other things that are not valid
    if(!courseCode || !courses[courseCode]) return

    addCourseToSemester(semesterIndex, courseCode)
}

function droppingCourseOnSummer(ev, summerIndex) {
    ev.preventDefault()
    ev.stopPropagation()

    const courseCode = ev.dataTransfer.getData("text/plain")

    // preventing errors when dragging and dropping other things that are not valid
    if(!courseCode || !courses[courseCode]) return

    addCourseToSummer(summerIndex, courseCode)
}

function droppedCourseFromSemester(ev, semesterIndex) {
    const courseCode = ev.target.id

    // removing course from the semester
    removeCourseFromSemester(semesterIndex, courseCode)

    // adding the course back to the semester if it was not dropped on another semester/summer
    if(!takenCourses.has(courseCode)) {
        addCourseToSemester(semesterIndex, courseCode)
    }
}

function droppedCourseFromSummer(ev, summerIndex) {
    const courseCode = ev.target.id

    // removing course from the summer
    removeCourseFromSummer(summerIndex, courseCode)

    // adding the course back to the summer if it was not dropped on another semester/summer
    if(!takenCourses.has(courseCode)) {
        console.log(summerIndex);
        addCourseToSummer(summerIndex, courseCode)
    }
}

function allowCourseDrop(ev) {
    ev.preventDefault()
}




// loading and exporting save files
const coursePlannerSaveFileVersion = 1

// the save file is just a single json string with the following format
// {
//      isCoursePlannerSaveFile: boolean value. it checks that this exists and is set to true to make sure it is a valid save file
//      coursePlannerSaveFileVersion: integer. used to convert old save file formats into new ones in case the format changes
//      semesters: contains the array of semesters
//      summers: contains the array of summers
//      courses: contains the object of courses
// }

// loading/reading save files
// detecting when a file has been uploaded
const fileUploadBtn = document.querySelector("#loadSaveFileBtn")
fileUploadBtn.addEventListener("change", () => {
    if(fileUploadBtn.files.length == 0) return

    const reader = new FileReader()
    reader.onload = (e) => {
        try {
            const saveObject = JSON.parse(e.target.result)
            
            if(saveObject.isCoursePlannerSaveFile && saveObject.coursePlannerSaveFileVersion == coursePlannerSaveFileVersion) {
                localStorage.setItem("semesters", JSON.stringify(saveObject.semesters))
                localStorage.setItem("summers", JSON.stringify(saveObject.summers))
                localStorage.setItem("courses", JSON.stringify(saveObject.courses))
                
                getCoursesFromStorage()
                getSemestersFromStorage()
            }
        }
        catch(error) {
            alert("invalid save file")  
        }
    }

    reader.readAsText(fileUploadBtn.files[0]);
})

// exporting save files
document.querySelector(".exportSaveFile").addEventListener("click", () => {
    // creating save object that will be parsed into a json string
    const saveObject = {
        isCoursePlannerSaveFile: true,
        coursePlannerSaveFileVersion,
        semesters,
        summers,
        courses
    }

    const stringifiedSaveObject = JSON.stringify(saveObject) 

    const blob = new Blob([stringifiedSaveObject], { type: "application/json" });
    const blobURL = URL.createObjectURL(blob)

    // downloading the file
    var link = document.createElement("a");
    link.download = "course-planner-save-file.json";
    link.href = blobURL;
    link.click()
});