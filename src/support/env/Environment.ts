declare global {
    interface Window { __ENV__: Environment; }
}

type Environment = {[name: string]: any};

export default Environment;