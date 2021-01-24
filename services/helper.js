

class Helper {


    printTotalSize() {
        console.log(this.totalSize);
    }


    isObject(x) {
        return x != null && (typeof x === 'object' || typeof x === 'function') && !Array.isArray(x);
    }

    clone(from) {
        return JSON.parse(JSON.stringify(from));
    }
    merge(from, to) {

        for (var key in from) {

            if (!(key in to)) {
                to[key] = from[key];
                continue;
            }

            if (Array.isArray(from[key])) {
                to[key] = from[key];
                continue;
            }
            if (this.isObject(from[key])) {
                to[key] = this.merge(from[key], to[key])
                continue;
            }

            to[key] = from[key];
        }

        return to;
    }

}

module.exports = new Helper();