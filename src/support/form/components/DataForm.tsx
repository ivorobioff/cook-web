import React, {Component, ReactElement, Fragment, FormEvent} from 'react';
import {Box, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField, FormLabel, RadioGroup, Radio} from "@material-ui/core";
import {clone, cloneExcept, cloneWith, hasField, objectEmpty, readField, tryField} from "../../random/utils";
import {isBlank} from "../../validation/utils";
import FormHelperText from '@material-ui/core/FormHelperText';
import { Autocomplete } from '@material-ui/lab';
import { KeyboardDatePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';

export type DataFormResult = {[field: string]: any};
export type DataFormErrors = {[field: string]: any};
export type DataFormResultProvider = () => DataFormResult | null;
export type DataFormInputHandler = (value: any) => void;
export type DataFormReadyHandler = (provider: DataFormResultProvider) => void;
export type DataFormValidator = (value: any) => string | null | undefined;
export type DataFormConverter= (value: any) => any;
export type DataFormTouchHandler = () => void;
export type DataFormErrorHandler = (valid: boolean) => void;
export type DataFormValidateHandler = (result: DataFormResult) => DataFormErrors;
export type DataFormLayoutProvider = (registry: DataFormRendererRegistry) => ReactElement;

export class DataFormRendererRegistry {

    constructor(private renderers: {[name: string]: () => ReactElement}) {

    }

    render(name: string): ReactElement {

        if (!this.renderers[name]) {
            return (<Fragment></Fragment>)
        }
        
        return this.renderers[name]();
    }
}

export class DataFormHook {
    provider?:  DataFormResultProvider;
}

export interface DataFormControl {
    type: string;
    label: string;
    name: string;
    value?: any;
    disabled?: boolean;
    values?: {[key: string]: string};
    onInput?: DataFormInputHandler;
    validate?: DataFormValidator;
    required?: boolean | string;
    convertOut?: DataFormConverter;
    uselessOut?: any;
    convertIn?: DataFormConverter;
    uselessIn?: any;
    extra?: any;
}

export interface DataFormCommonProps {
    className?: string;
    errors?: {[field: string]: string};

    /**
     * @deprecated use hook instead
     */
    onReady?: DataFormReadyHandler;

    hook?: DataFormHook;

    onTouch?: DataFormTouchHandler;
    onError?: DataFormErrorHandler;
    onValidate?: DataFormValidateHandler;
    autoComplete?: 'on'|'off';
    fresh?: boolean;
    value?: DataFormResult;
}

export interface DataFormProps extends DataFormCommonProps {
    controls: DataFormControl[];
    unwrap?: boolean;
    layout?: DataFormLayoutProvider;
}

type DataFormInput = { value: any, error?: string | null | undefined};
type DataFormInputs = {[field: string]: DataFormInput}

interface DataFormState {
    inputs: DataFormInputs;
    controls: DataFormControl[];
}

export type DataFormControlRenderer = (
    control: DataFormControl,
    context: DataFormRenderContext) => ReactElement;

interface DataFormRenderContext {
    onChange:(value: any) => void;
    state: DataFormState;
}

function hasError(inputs: DataFormInputs, controls: DataFormControl[]): boolean {

    let disabledControls = disabledControlNames(controls);

    return !!Object.keys(inputs)
        .find(n => inputs[n].error && disabledControls.indexOf(n) === -1);
}

function resolveValue(control: DataFormControl, context: DataFormRenderContext): any;
function resolveValue(control: DataFormControl, input: DataFormInput): any

function resolveValue(control: DataFormControl, param: DataFormRenderContext | DataFormInput): any {

    let input = hasField(param, 'state')
        ? (param as DataFormRenderContext).state.inputs[control.name]
        : param as DataFormInput;

    if (!hasField(input, 'value')) {
        return convertIn(control, control.value);
    }

    return input.value;
}

function createResult(controls: DataFormControl[], inputs: DataFormInputs): DataFormResult {
    let result: DataFormResult = {};

    controls.forEach(control => {
        if (!control.disabled) {
            let input = inputs[control.name];

            if (typeof input === 'undefined') {
                result[control.name] = convertOut(control,  { value: convertIn(control, control.value) });
            } else {
                result[control.name] = convertOut(control, input);
            }
        }
    });

    return result;
}

function validateAll(controls: DataFormControl[], inputs: DataFormInputs): DataFormErrors {
    let errors: DataFormErrors = {};

    controls.forEach(control => {
        if (!control.disabled) {
            let input = inputs[control.name];
            let value = resolveValue(control, input);
            let error = validate(control, value);

            if (error) {
                errors[control.name] = error;
            }
        }
    });

    return errors;
}

function resolveError(control: DataFormControl, context: DataFormRenderContext): string | null | undefined {

    if (control.disabled) {
        return undefined;
    }

    return tryField(context, `state.inputs.${control.name}.error`, undefined);
}

function hashToOptions(hash: {[name: string]: string }): {value: string, title: string}[] {
    return Object.keys(hash).map(key => ({ value: key, title: hash[key] }));
}

function renderText(control: DataFormControl, context: DataFormRenderContext): ReactElement {

    let error = resolveError(control, context);
    let value = resolveValue(control, context);

    if (typeof value === 'undefined' || value === null) {
        value = '';
    }

    return (<TextField autoComplete="off" name={control.name}
                       variant={tryField(control, 'extra.variant', 'standard')}
                       type={tryField(control, 'extra.type', 'input')}
                       multiline={tryField(control, 'extra.multiline', false)}
                       error={!!error}
                       label={control.label}
                       onChange={e => context.onChange(e.target.value)}
                       value={value}
                       disabled={control.disabled}
                       helperText={error}
                       fullWidth />);
}

function renderSelect(control: DataFormControl, context: DataFormRenderContext): ReactElement {

    const values = readField<{[key: string]: string}>(control, 'values');

    const error = resolveError(control, context);

    let value = resolveValue(control, context);

    if (typeof value === 'undefined' || value === null) {
        value = '';
    }

    return (<FormControl fullWidth error={!!error}>
        <InputLabel>{control.label}</InputLabel>
        <Select name={control.name}
                fullWidth
                onChange={e => context.onChange(e.target.value)}
                value={value}
                disabled={control.disabled}>
            {Object.keys(values).map((key, i) => {
                return (<MenuItem key={i} value={key}>{values[key]}</MenuItem>)
            })}
        </Select>
        {error && (<FormHelperText>{error}</FormHelperText>)}
    </FormControl>);
}

function renderAutocomplete(control: DataFormControl, context: DataFormRenderContext): ReactElement {
    const isMultiple = !!control.extra?.multiple;

    const originalValues = control.values!;
    const availableValues = hashToOptions(originalValues);
    
    const error = resolveError(control, context);

    let providedValues = resolveValue(control, context);

    if (isMultiple) {
        providedValues = (providedValues || []).map((value: string) => ({ value, title: originalValues[value]}));
    } else {
        providedValues = providedValues ? {  value: providedValues, title:  originalValues[providedValues]} : null;
    }

    return (<FormControl fullWidth error={!!error}><Autocomplete 
        disabled={control.disabled}
        multiple={control.extra?.multiple}
        options={availableValues}
        getOptionLabel={(option) => option.title}
        onChange={(e: any, selectedOptions: any) => {
            if (isMultiple) {
                const values = (selectedOptions || []).map((o: any) => o.value);

                context.onChange(values);
            } else {
                context.onChange((selectedOptions || {}).value);
            }
        }}
        value={providedValues}
        getOptionSelected={(option, againstOption) => option.value === againstOption.value}
        filterSelectedOptions
        renderInput={(params) => (
          <TextField
            {...params}
            error={!!error}
            variant="standard"
            label={control.label}
          />
        )} />
        {error && (<FormHelperText>{error}</FormHelperText>)}
        </FormControl>);
}

function renderRadio(control: DataFormControl, context: DataFormRenderContext): ReactElement {
    
    const values = control.values!;

    const error = resolveError(control, context);

    const value = resolveValue(control, context);
    
    return (<FormControl component="fieldset">
        <FormLabel component="legend">{control.label}</FormLabel>
        <Box mb={1}/>
        <RadioGroup name={control.name} 
                    onChange={e => context.onChange(e.target.value)} >
            {Object.keys(values).map((key, i) => {
                return (<FormControlLabel key={i} 
                    value={key} 
                    control={<Radio checked={value === key} />} 
                    label={values[key]} 
                    disabled={control.disabled} />)
            })}
        </RadioGroup>
        {error && (<FormHelperText>{error}</FormHelperText>)}
    </FormControl>)
}


function renderCheckbox(control: DataFormControl, context: DataFormRenderContext): ReactElement {

    let error = resolveError(control, context);

    let value = resolveValue(control, context);

    if (typeof value === 'undefined' || value === null) {
        value = false;
    }

    return (
        <FormControl fullWidth error={!!error}>
            <FormControlLabel control={
            <Checkbox checked={value}
                      disabled={control.disabled}
                      onChange={e => context.onChange(e.target.checked)}
                      name={control.name}
                      color="primary" />}
                              label={control.label} />
            {error && (<FormHelperText>{error}</FormHelperText>)}
        </FormControl>);
}

function renderDate(control: DataFormControl, context: DataFormRenderContext): ReactElement {
    let value = resolveValue(control, context);
    let error = resolveError(control, context);

    if (typeof value === 'undefined' || value === null) {
        value = null;
    }

    const constraint = control.extra.constraint || undefined;
    const onlyFuture = constraint === 'only-future';
    const onlyPast = constraint === 'only-past';

    return (<MuiPickersUtilsProvider utils={MomentUtils}>
        <KeyboardDatePicker
            error={!!error}
            fullWidth
            disabled={control.disabled}
            margin="normal"
            disableFuture={onlyPast}
            disablePast={onlyFuture}
            label={control.label}
            format="DD/MM/YYYY"
            value={value}
            onChange={e => {
                context.onChange(e);
            }}
            helperText={error}
      />
    </MuiPickersUtilsProvider>);
}

function validate(control: DataFormControl, value: any): string | null | undefined {
    if (isBlank(value)) {
        let required = control.required;

        if (required) {
            let message = required;

            if (typeof message !== 'string') {
                message = 'It\'s required!'
            }

            return message;
        }

        return null;
    }

    return (control.validate || (() => null))(value);
}

function uselessForConvert(value: any): boolean {
    return typeof value === 'undefined' || value === null 
        || (typeof value === 'string' && value.trim().length === 0);
}

function convertIn(control: DataFormControl, value: any): any {

    if (uselessForConvert(value)) {
        return control.uselessIn;
    }

    if (control.convertIn) {
        return control.convertIn(value);
    }

    return value;
}

function convertOut(control: DataFormControl, {value, error}: DataFormInput): any {

    if (error) {
        return value;
    }

    if (uselessForConvert(value)) {
        return control.uselessOut;
    }

    if (control.convertOut) {
        value = control.convertOut(value);
    }

    return value;
}

function assignErrors(errors: {[name: string]: string}, inputs: DataFormInputs) {
    Object.keys(errors).forEach(field => {
        let error = errors[field];

        let input = inputs[field] || { value: undefined };

        if (!input.error) {
            input.error = error;
        }

        inputs[field] = input;
    });

    return inputs;
}

function disabledControlNames(controls: DataFormControl[]): string[] {
    return controls.filter(c => c.disabled).map(c => c.name);
}

function lostControlNames(controls: DataFormControl[], inputs: DataFormInputs): string[] {
    let lostKeys = [];
    let currentKeys = controls.map(c => c.name);

    for (let key in inputs) {
        if (!currentKeys.includes(key)) {
            lostKeys.push(key);
        }
    }

    return lostKeys;
}

function cloneControlsWithFormValues(controls: DataFormControl[], formValues: DataFormResult) {
    return controls.map(control => cloneWith(control, {
        value: formValues[control.name]
    }));
}

class DataForm extends Component<DataFormProps, DataFormState> {

    private renderers: {[name: string]: DataFormControlRenderer} = {
        'text': renderText,
        'select': renderSelect,
        'autocomplete': renderAutocomplete,
        'checkbox': renderCheckbox,
        'radio': renderRadio,
        'date': renderDate
    };

    private scheduledTasks: ((controls: DataFormControl[]) => void)[] = [];

    constructor(props: DataFormProps) {
        super(props);

        let controls = props.controls;

        if (typeof props.value !== 'undefined') {
            controls = cloneControlsWithFormValues(controls, props.value!);
        }

        this.state = {
            inputs: {},
            controls
        };

        if (this.props.onReady) {
            this.props.onReady(this.prepareResult.bind(this));
        }

        if (this.props.hook) {
            this.props.hook.provider = this.prepareResult.bind(this);
        }
    }
    
    prepareResult() {
        let errors = validateAll(this.state.controls, this.state.inputs);

        let result = null;

        if (objectEmpty(errors)) {
            result = createResult(this.state.controls, this.state.inputs);

            if (this.props.onValidate) {
                errors = cloneExcept(this.props.onValidate(result), ...disabledControlNames(this.state.controls));
            }
        }

        if (!objectEmpty(errors)) {
            let inputs = clone(this.state.inputs);

            assignErrors(errors, inputs);

            this.setState({ inputs });

            if (this.props.onError) {
                this.props.onError(true);
            }

            result = null;
        }

        return result;
    }

    componentDidUpdate(prevProps: DataFormProps) {

        const oldControls = this.state.controls;
        let newControls = oldControls;

        if (this.props.controls !== prevProps.controls) {
            newControls = this.props.controls;
        }

        if (this.props.value !== prevProps.value) {
            if (typeof this.props.value === 'undefined') {
                newControls = this.props.controls;
            } else {
                newControls = cloneControlsWithFormValues(newControls, this.props.value!);
            }
        }

        // assigned external errors
        if (this.props.errors !== prevProps.errors) {

            let disabledControls = disabledControlNames(newControls);
            let lostControls = lostControlNames(newControls, this.state.inputs);

            let errors: DataFormErrors = {};
            let possibleErrors = this.props.errors || {}
    
            newControls.forEach(control => {
                if (possibleErrors[control.name] && !disabledControls.includes(control.name)) {
                    errors[control.name] = possibleErrors[control.name];
                }
            });

            let inputs = cloneExcept(this.state.inputs, ...lostControls);

            if (!objectEmpty(errors)) {
                assignErrors(errors, inputs);
                this.setState({ inputs });
            }

            if (this.props.onError) {
                this.props.onError(hasError(inputs, newControls));
            }
        }

        // remove inputs for disabled and inexistent controls
        if (oldControls !== newControls) {

            this.setState({
                controls: newControls
            });

            let disabledControls = disabledControlNames(newControls);
            let lostControls = lostControlNames(newControls, this.state.inputs);

            const inputs = cloneExcept(this.state.inputs, ...disabledControls, ...lostControls);

            this.setState({
                inputs
            });

            // in case if some inputs with errors are gone
            if (this.props.onError) {
                this.props.onError(hasError(inputs, newControls));
            }
        }

        // run scheduled tasks
        this.scheduledTasks.forEach(task => task(newControls));

        this.scheduledTasks = [];

        let oldFresh = tryField(prevProps, 'fresh', true);
        let newFresh = tryField(this.props, 'fresh', true);

        if (newFresh && oldFresh !== newFresh) {
            this.setState({ inputs: {} });
        }
    }

    render() {
        const {
            className,
            autoComplete,
            children,
            unwrap
        } = this.props;

        const { 
            controls
        } = this.state;

        let layout = this.props.layout;

        if (!layout) {
            layout = registry => {
                return (<Fragment>
                    {controls.map((control, i) => {
                        return (<Fragment key={i}>
                            { registry.render(control.name) }
                            { i < controls.length - 1 ? ( <Box m={2} />) : '' }
                        </Fragment>);
                    })}
                </Fragment>);
            }
        }

        const renderers: {[name: string]: () => ReactElement} = {};

        controls.forEach(control => {
            renderers[control.name] = () => {
                let renderer = readField<DataFormControlRenderer>(this.renderers, control.type);
                return renderer(control, this.createRenderContext(control));
            }
        });

        const registry = new DataFormRendererRegistry(renderers);

        if (unwrap) {
            return (<Fragment>
                {layout(registry)}
                {children}
            </Fragment>)
        }
        
        return (<form noValidate onSubmit={this.defaultFormSubmit.bind(this)} autoComplete={autoComplete} className={className}>
            {layout(registry)}
            {children}
        </form>);
    }
    
    defaultFormSubmit(e: FormEvent) {
        e.preventDefault();
    }
    
    private createRenderContext(control: DataFormControl): DataFormRenderContext {
        return {
            onChange: value => {
                let error = validate(control, value);

                let input = { value, error };

                if (control.onInput) {
                    control.onInput(convertOut(control, input));
                }

                this.setState({
                    inputs: cloneWith(this.state.inputs, {
                        [control.name]: input
                    })
                });

                if (this.props.onTouch) {
                    this.props.onTouch();
                }

                this.scheduledTasks.push(newControls => {
                    if (this.props.onError) {

                        let lostControls = lostControlNames(newControls, this.state.inputs);

                        let inputs = cloneExcept(this.state.inputs, ...lostControls);

                        // we need to check errors after controls up to date
                        this.props.onError(hasError(inputs, newControls));
                    }
                });
            },
            state: this.state
        }
    }
}

export default DataForm;