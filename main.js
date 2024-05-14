class Course {
    constructor ({ courseCode, name, credits, taken=false, prereqs=[], coreqs=[] }) {
        courseCode = courseCode.replace(/\s/g, '').toUpperCase()

        this.discipline = courseCode.slice(0,4)
        this.number = courseCode.slice(4, 8)
        this.courseCode = courseCode
        
        this.credits = credits
        this.prereqs = prereqs
        this.coreqs = coreqs
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
    const result = JSON.parse(localStorage.getItem("semesters"))
    updateSemesters(result)
    semesters = result
}

function getCoursesFromStorage() {
    const result = JSON.parse(localStorage.getItem("courses"))
    updateCourses(result)
    courses = result
}


getCoursesFromStorage()
getSemestersFromStorage()


function addSemester() {
    semesters.push([])
    updateSemesters()
}

function updateSemesters() {

    const wrapper = document.querySelector(".availableSemesters")
    
    wrapper.innerHTML = ""

    // When a course is added to a semester it is added here after adding the semester markup.
    // This is where we check for prereqs.
    // When checking for coreq, we check here in case we already took them, otherwise we check
    // in the current list of courses being added to see if it's there since coreqs
    // can be taken at the same time as the class that required it
    const coursesTaken = new Set()

    for(i = 0; i < semesters.length; i++) {
        const year = Math.floor(i / 2) + 1
        const semester = i % 2 + 1

        const markup = 
        `
        <div id="${i}" ondragover="allowCourseDrop(event)" ondrop="droppingCourse(event, ${i})" class="semester semester${i}">
            <h2>Year ${year} Semester ${semester}</h2>

            <div class="coursesInSemester"></div>

            <div class="totalCredits">Total Credits: <span class="credits"></span></div>

            <div onclick="removeSemester(${i})" class="removeSemester redbtn">Remove Semester</div>
        </div>
        `

        wrapper.innerHTML += markup

        const semesterElement = document.querySelector(".semester"+i)
        var totalCredits = 0

        for(let courseCode of semesters[i]) {
            const course = courses[courseCode]
            takenCourses.add(courseCode)

            totalCredits += Number(course.credits)

            const courseMarkup = 
            `
            <div draggable="true" id="${courseCode}" ondragstart="draggingCourse(event, ${i})" ondragend="droppedCourseFromAnother(event, ${i})" class="courseWrapper">
                <div class="courseCode">${course.discipline} ${course.number}</div>
                <div class="courseName">${course.name}</div>
                <div class="courseCredits">${course.credits}</div>
                <!-- <div class="coursePrereqs"></div>
                <div class="courseCoreqs"></div> -->
                <div onclick="removeCourseFromSemester(${i}, '${courseCode}')" class="removeCourseFromSemester">Remove</div>
            </div>
            `

            semesterElement.querySelector(".coursesInSemester").innerHTML += courseMarkup;
        }

        semesterElement.querySelector(".credits").innerHTML = totalCredits

        // Adding text to tell user to drag and drop semesters if there are no classes in it
        if(semesters[i].length == 0) {
            semesterElement.querySelector(".coursesInSemester").innerHTML = 
            `
            <div class="coursesPlaceHolder">
                <p>Drag and drop courses into the semseter to add them</P
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

function addCourse() {

    const courseCode = document.querySelector(".newCourseCode").value;
    const name = document.querySelector(".newCourseName").value;
    const credits = document.querySelector(".newCourseCredits").value;
    const prereqs = []
    const coreqs = []

    document.querySelectorAll(".courseFormSection input").forEach(e => e.value = "");
    const newCourse = new Course({ courseCode, name, credits, prereqs, coreqs })

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

    // first adding courses that aren't already in use and then adding the ones in use at the end
    const orderedCourses = Object.keys(courses).filter(courseCode => !takenCourses.has(courseCode)).
    concat(Object.keys(courses).filter(courseCode => takenCourses.has(courseCode) ))

    for(let courseCode of orderedCourses) {
        const { discipline, number, name, credits, taken, prereqs, coreqs } = courses[courseCode]

        console.log("Updating courses")

        const markup = 
        `
        <div ondragstart="draggingCourse(event)" id="${courseCode}" draggable="true" class="courseWrapper ${takenCourses.has(courseCode)? "crossed" : ""}">
            <div class="courseCode">${discipline} ${number}</div>
            <div class="courseName">${name}</div>
            <div class="courseCredits">${credits}</div>
            <div onclick="removeCourseFromList('${courseCode}')" class="removeCourseFromList">Remove</div>
        </div>
        `

        wrapper.innerHTML += markup
    }
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