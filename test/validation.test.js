const { userSchema } = require("../validation/userSchema");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");


describe("user object validation test", () => {
    it("1.doesn't permit a trivial password", () => {
        const { error } = userSchema.validate(
            {name: "Bob", email: "bob@sample.com", password: "password"},
            {abortEarly: false},
        );
        expect(
            error.details.find(detail => detail.context.key == "password")
        ).toBeDefined();
    });
    it("2.email should be specified", () => {
        const { error } = userSchema.validate(
            {name: "Rosie",  password: "Ajkhkj9&uh" },
            {abortEarly: false},
        );
        expect(
            error.details.find(detail => detail.context.key === "email")
        ).toBeDefined();
    });
    it("3.email must be valid", () => {
        const { error } = userSchema.validate(
            {name: "Rosie", email: "rosiesample.com", password: "Ajkhkj9&uy"},
            {abortEarly: false},
        );
        expect(
            error.details.find(detail => detail.context.key == "email")
        ).toBeDefined();
    });
    it("4.password must be present", () => {
        const {error} = userSchema.validate(
            {name: "Rosie", email: "rosie@sample.com", password: ""},
            {abortEarly: false}
        );
        expect(
            error.details.find(detail => detail.context.key == "password")
        ).toBeDefined();
    });
    it("5.name must be present", () => {
        const {error} = userSchema.validate(
            {name: null, email: "rosie@sample.com", password: "Djkhkj9&uy"},
            {abortEarly: false}
        );
        expect(
            error.details.find(detail => detail.context.key == "name")
        ).toBeDefined();
    });
    it("6.name must be valid", () => {
        const {error} = userSchema.validate(
            {name: "no", email: "rosie@sample.com", password: "Djkhkj9&uy"},
            {abortEarly: false}
        );
        expect(
            error.details.find(detail => detail.context.key == "name")
        ).toBeDefined();
    });
    it("7.In case of valid user object, error should be falsy", () => {
        const {error} = userSchema.validate(
            {name: "Rosie", email: "rosie@sample.com", password: "Djkhkj9&uy"},
            {abortEarly: false}
        );
        expect(error).toBeFalsy();
    });
});

describe("task object validation test", () => {
    it("8.task schema requires a title", () => {
        const { error } = taskSchema.validate(
            {task: null, isCompleted: true, priority: "medium"},
            {abortEarly: false},
        );
        expect(
            error.details.find((detail) => detail.context.key == "title")
        ).toBeDefined();
    });
    it("9.isCompleted should be valid when provided", () => {
        const { error } = taskSchema.validate(
            {title: "do chores now", isCompleted: true, priority: "medium"},
            {abortEarly: false},
        );
        expect(error).toBeFalsy();
    });
    it("10. If an isCompleted value is not specified but the rest of the object is valid, a default of false", () => {
        const { error } = taskSchema.validate(
            {title: "do exercise now",  priority: "high"},
            {abortEarly: false},
        );
        expect(error).toBeFalsy();
    });
    it("11.If isCompleted is true, it remains true after validation", () => {
        const {value} = taskSchema.validate(
            {title: "do chores now", isCompleted: true, priority: "medium"},
            {abortEarly: false}
        );
        expect(value.isCompleted).toBeTruthy();
    });    
});

describe("patchTaskSchema validation", () => {
    it("12.patchTaskSchema doesn't require a title", () => {
        const { error } = patchTaskSchema.validate(
            {isCompleted: true, priority: "medium"},
            {abortEarly: false},
        );
        expect(error).toBeUndefined();
    });
    it("13.If no value is provided for isCompleted this remains undefined in the returned value.", () => {
        const { value } = patchTaskSchema.validate(
            { priority: "medium"},
            {abortEarly: false},
        );
        expect(value.isCompleted).toBeUndefined();
    });
}); 
